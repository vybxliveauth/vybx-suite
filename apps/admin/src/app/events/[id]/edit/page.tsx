"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Trash2, Loader2, Save, AlertTriangle, ArrowLeft, Tag, X,
} from "lucide-react";
import {
  Button, Input, Label, Textarea, Card, CardContent, CardHeader,
  CardTitle, CardDescription, Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue, Separator, Badge,
} from "@vybx/ui";
import { PromoterShell } from "@/components/layout/PromoterShell";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { api } from "@/lib/api";
import { useEventDetail } from "@/lib/queries";
import type { EventDetail } from "@/lib/types";

// ── Schemas ────────────────────────────────────────────────────────────────────
const tierSchema = z.object({
  /** Undefined = new tier (not yet in DB) */
  id: z.string().optional(),
  name: z.string().min(1, "Nombre requerido"),
  price: z.coerce.number().min(0, "Precio inválido"),
  quantity: z.coerce.number().min(1, "Mínimo 1"),
  /** How many have been sold — read-only, used for validation */
  sold: z.coerce.number().default(0),
});

const schema = z.object({
  title:       z.string().min(3, "Mínimo 3 caracteres"),
  description: z.string().optional(),
  location:    z.string().min(2, "Ubicación requerida"),
  date:        z.string().min(1, "Fecha requerida"),
  time:        z.string().min(1, "Hora requerida"),
  isActive:    z.boolean(),
  tiers:       z.array(tierSchema).min(1, "Agrega al menos un tipo de boleto"),
  tagInput:    z.string().optional(),
  image:       z.string().url("URL inválida").or(z.literal("")).optional(),
}).superRefine((data, ctx) => {
  data.tiers.forEach((tier, i) => {
    if (tier.quantity < tier.sold) {
      ctx.addIssue({
        code: "custom",
        path: ["tiers", i, "quantity"],
        message: `No puede ser menor a los ${tier.sold} boletos vendidos`,
      });
    }
  });
});

type FormValues = z.infer<typeof schema>;

// ── Helpers ────────────────────────────────────────────────────────────────────
function toDateParts(iso: string) {
  const d = new Date(iso);
  const date = d.toISOString().slice(0, 10);
  const time = d.toTimeString().slice(0, 5);
  return { date, time };
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [serverError, setServerError] = useState<string | null>(null);
  const [tags, setTags]           = useState<string[]>([]);
  /** IDs of tiers that existed on load and were removed in the form */
  const [removedTierIds, setRemovedTierIds] = useState<string[]>([]);

  const eventQuery = useEventDetail(id);

  const {
    register, handleSubmit, control, setValue, watch, reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { isActive: false, tiers: [], tagInput: "", image: "" },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "tiers" });

  // ── Populate form when event data loads ─────────────────────────────────────
  useEffect(() => {
    const ev = eventQuery.data;
    if (!ev) return;
    const { date, time } = toDateParts(ev.date);
    reset({
      title:       ev.title,
      description: ev.description ?? "",
      location:    ev.location ?? "",
      date,
      time,
      isActive:    ev.isActive,
      image:       ev.image ?? "",
      tagInput:    "",
      tiers: ev.ticketTypes.map((t) => ({
        id:       t.id,
        name:     t.name,
        price:    t.price,
        quantity: t.quantity,
        sold:     t.sold,
      })),
    });
    setTags(ev.tags ?? []);
  }, [eventQuery.data, reset]);

  // ── Tag helpers ─────────────────────────────────────────────────────────────
  function addTag() {
    const raw = (watch("tagInput") ?? "").trim();
    if (!raw || tags.includes(raw)) { setValue("tagInput", ""); return; }
    setTags((p) => [...p, raw]);
    setValue("tagInput", "");
  }

  function removeTag(tag: string) {
    setTags((p) => p.filter((t) => t !== tag));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
    if (e.key === "Backspace" && !(watch("tagInput") ?? "").trim()) {
      setTags((p) => p.slice(0, -1));
    }
  }

  // ── Remove tier ─────────────────────────────────────────────────────────────
  function handleRemoveTier(index: number) {
    const tierId = fields[index]?.id;
    if (tierId) setRemovedTierIds((p) => [...p, tierId]);
    remove(index);
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const dateTime = new Date(`${values.date}T${values.time}`).toISOString();

      // 1 — Update event fields
      await api.patch(`/events/${id}`, {
        title:       values.title,
        description: values.description || undefined,
        location:    values.location,
        date:        dateTime,
        isActive:    values.isActive,
        image:       values.image || undefined,
        tags,
      });

      // 2 — Delete removed tiers
      await Promise.all(
        removedTierIds.map((tid) => api.delete(`/events/ticket-types/${tid}`))
      );

      // 3 — Update existing tiers / create new ones
      for (const tier of values.tiers) {
        if (tier.id) {
          // Existing tier — only patch if something changed
          await api.patch(`/events/ticket-types/${tier.id}`, {
            name:     tier.name,
            price:    tier.price,
            quantity: tier.quantity,
          });
        } else {
          // New tier
          await api.post("/events/ticket-types", {
            eventId:  id,
            name:     tier.name,
            price:    tier.price,
            quantity: tier.quantity,
          });
        }
      }

      router.push(`/events/${id}`);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Error al guardar los cambios");
    }
  }

  // ── States ───────────────────────────────────────────────────────────────────
  if (eventQuery.isLoading) {
    return (
      <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Eventos", href: "/events" }, { label: "Editar" }]} />}>
        <div className="flex items-center justify-center py-32 text-muted-foreground gap-2">
          <Loader2 className="size-5 animate-spin" /> Cargando evento…
        </div>
      </PromoterShell>
    );
  }

  if (eventQuery.isError) {
    return (
      <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Eventos", href: "/events" }, { label: "No encontrado" }]} />}>
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-muted-foreground">
          <AlertTriangle className="size-10 opacity-40" />
          <p className="text-sm">Evento no encontrado o sin acceso</p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/events">Volver a eventos</Link>
          </Button>
        </div>
      </PromoterShell>
    );
  }

  const tiersValues = watch("tiers");

  return (
    <PromoterShell
      breadcrumb={
        <PageBreadcrumb
          items={[
            { label: "Eventos", href: "/events" },
            { label: watch("title") || "Editar evento", href: `/events/${id}` },
            { label: "Editar" },
          ]}
        />
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Editar evento</h1>
            <p className="text-sm text-muted-foreground">
              Los cambios en boletos ya vendidos pueden afectar a los compradores.
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link href={`/events/${id}`}>
              <ArrowLeft className="size-4" /> Ver evento
            </Link>
          </Button>
        </div>

        {/* ── General info ──────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Información general</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            <div className="space-y-1.5">
              <Label htmlFor="title">Nombre del evento *</Label>
              <Input id="title" placeholder="Ej. Neon Rave 2027" {...register("title")} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Describe el evento..."
                rows={4}
                {...register("description")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location">Ubicación *</Label>
              <Input id="location" placeholder="Venue, Ciudad" {...register("location")} />
              {errors.location && <p className="text-xs text-destructive">{errors.location.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="date">Fecha *</Label>
                <Input id="date" type="date" {...register("date")} />
                {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="time">Hora *</Label>
                <Input id="time" type="time" {...register("time")} />
                {errors.time && <p className="text-xs text-destructive">{errors.time.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="image">URL de imagen de portada</Label>
              <Input id="image" type="url" placeholder="https://..." {...register("image")} />
              {errors.image && <p className="text-xs text-destructive">{errors.image.message}</p>}
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label>Etiquetas</Label>
              <div className="flex flex-wrap gap-1.5 p-2 rounded-md border border-input bg-background min-h-[38px] items-center">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1 pr-1 text-xs">
                    <Tag className="size-2.5" />
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="ml-0.5 opacity-60 hover:opacity-100">
                      <X className="size-2.5" />
                    </button>
                  </Badge>
                ))}
                <input
                  className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  placeholder={tags.length === 0 ? "Escribe y presiona Enter…" : "Agregar…"}
                  {...register("tagInput")}
                  onKeyDown={handleTagKeyDown}
                  onBlur={addTag}
                />
              </div>
              <p className="text-xs text-muted-foreground">Presiona Enter o coma para agregar cada etiqueta.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Visibilidad</Label>
              <Select
                value={watch("isActive") ? "true" : "false"}
                onValueChange={(v) => setValue("isActive", v === "true")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Oculto (borrador)</SelectItem>
                  <SelectItem value="true">Visible al público</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ── Ticket tiers ──────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm">Tipos de boleto</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                No puedes reducir la cantidad por debajo de los boletos ya vendidos.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ name: "", price: 0, quantity: 100, sold: 0 })}
            >
              <Plus className="size-4" /> Agregar tipo
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, i) => {
              const sold = tiersValues[i]?.sold ?? 0;
              const isExisting = !!field.id;
              return (
                <div key={field.id}>
                  {i > 0 && <Separator className="mb-4" />}
                  <div className="space-y-3">
                    {/* Sold warning */}
                    {isExisting && sold > 0 && (
                      <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-md px-3 py-2">
                        <AlertTriangle className="size-3.5 shrink-0" />
                        {sold} boletos vendidos — la cantidad no puede bajar de {sold}.
                      </div>
                    )}
                    <div className="grid grid-cols-[1fr_100px_120px_auto] gap-3 items-end">
                      <div className="space-y-1.5">
                        <Label>Nombre</Label>
                        <Input placeholder="General, VIP…" {...register(`tiers.${i}.name`)} />
                        {errors.tiers?.[i]?.name && (
                          <p className="text-xs text-destructive">{errors.tiers[i]?.name?.message}</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Precio (MXN)</Label>
                        <Input type="number" min="0" step="50" {...register(`tiers.${i}.price`)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>
                          Cantidad
                          {sold > 0 && (
                            <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                              (mín. {sold})
                            </span>
                          )}
                        </Label>
                        <Input
                          type="number"
                          min={sold > 0 ? sold : 1}
                          {...register(`tiers.${i}.quantity`)}
                        />
                        {errors.tiers?.[i]?.quantity && (
                          <p className="text-xs text-destructive">{errors.tiers[i]?.quantity?.message}</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveTier(i)}
                        disabled={fields.length === 1}
                        className="text-destructive hover:text-destructive"
                        title={sold > 0 ? `Este tier tiene ${sold} boletos vendidos` : "Eliminar"}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    {/* Sold progress */}
                    {isExisting && sold > 0 && (tiersValues[i]?.quantity ?? 0) > 0 && (
                      <div className="pl-0.5">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>Ocupación actual</span>
                          <span className="tabular-nums">
                            {sold} / {tiersValues[i]?.quantity} ({Math.round((sold / (tiersValues[i]?.quantity ?? 1)) * 100)}%)
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            style={{
                              width: `${Math.min(100, Math.round((sold / (tiersValues[i]?.quantity ?? 1)) * 100))}%`,
                              background: "hsl(262.1 83.3% 57.8%)",
                              height: "100%",
                              borderRadius: 9999,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {errors.tiers && typeof errors.tiers.message === "string" && (
              <p className="text-xs text-destructive">{errors.tiers.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Server error */}
        {serverError && (
          <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2.5">
            <AlertTriangle className="size-4 mt-0.5 shrink-0" />
            {serverError}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isSubmitting ? "Guardando…" : "Guardar cambios"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
            Cancelar
          </Button>
          {!isDirty && (
            <p className="self-center text-xs text-muted-foreground">Sin cambios pendientes</p>
          )}
        </div>

      </form>
    </PromoterShell>
  );
}
