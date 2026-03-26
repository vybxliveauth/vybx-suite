"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { BackofficeShell } from "@/components/layout/BackofficeShell";
import { api } from "@/lib/api";
import type { EventRecord } from "@/lib/types";

// ── Schemas ──────────────────────────────────────────────────────────────────
const tierSchema = z.object({
  id:       z.string().optional(),
  name:     z.string().min(1, "Nombre requerido"),
  price:    z.coerce.number().min(0, "Precio inválido"),
  quantity: z.coerce.number().min(1, "Mínimo 1"),
  sold:     z.coerce.number().default(0),
});

const schema = z.object({
  title:       z.string().min(3, "Mínimo 3 caracteres"),
  description: z.string().optional(),
  location:    z.string().min(2, "Ubicación requerida"),
  date:        z.string().min(1, "Fecha requerida"),
  time:        z.string().min(1, "Hora requerida"),
  isActive:    z.boolean(),
  image:       z.string().url("URL inválida").or(z.literal("")).optional(),
  tagInput:    z.string().optional(),
  tiers:       z.array(tierSchema).min(1, "Agrega al menos un tipo de boleto"),
}).superRefine((data, ctx) => {
  data.tiers.forEach((tier, i) => {
    if (tier.quantity < tier.sold) {
      ctx.addIssue({ code: "custom", path: ["tiers", i, "quantity"], message: `No puede ser menor a los ${tier.sold} boletos vendidos` });
    }
  });
});

type FormValues = z.infer<typeof schema>;

function toDateParts(iso: string) {
  const d = new Date(iso);
  return { date: d.toISOString().slice(0, 10), time: d.toTimeString().slice(0, 5) };
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AdminEditEventPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [tags, setTags]               = useState<string[]>([]);
  const [removedTierIds, setRemovedTierIds] = useState<string[]>([]);

  const { register, handleSubmit, control, setValue, watch, reset, formState: { errors, isSubmitting, isDirty } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: { isActive: false, tiers: [], tagInput: "", image: "" },
    });

  const { fields, append, remove } = useFieldArray({ control, name: "tiers" });

  // ── Load event ──────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    // Use admin/all list with large limit, find by id client-side
    api.get<{ data: EventRecord[] }>(`/events/admin/all?limit=200`)
      .then((res) => {
        const ev = res.data.find((e) => e.id === id);
        if (!ev) { setFetchError("Evento no encontrado"); return; }
        const { date, time } = toDateParts(ev.date);
        reset({
          title: ev.title, description: ev.description ?? "",
          location: ev.location ?? "", date, time,
          isActive: ev.isActive, image: ev.image ?? "", tagInput: "",
          tiers: ev.ticketTypes.map((t) => ({
            id: t.id, name: t.name, price: t.price, quantity: t.quantity, sold: t.sold,
          })),
        });
        setTags(ev.tags ?? []);
      })
      .catch((e: Error) => setFetchError(e.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Tag helpers ─────────────────────────────────────────────────────────────
  function addTag() {
    const raw = (watch("tagInput") ?? "").trim();
    if (!raw || tags.includes(raw)) { setValue("tagInput", ""); return; }
    setTags((p) => [...p, raw]);
    setValue("tagInput", "");
  }
  function removeTag(tag: string) { setTags((p) => p.filter((t) => t !== tag)); }
  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
    if (e.key === "Backspace" && !(watch("tagInput") ?? "").trim()) setTags((p) => p.slice(0, -1));
  }

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
      await api.patch(`/events/${id}`, {
        title: values.title, description: values.description || undefined,
        location: values.location, date: dateTime, isActive: values.isActive,
        image: values.image || undefined, tags,
      });
      await Promise.all(removedTierIds.map((tid) => api.delete(`/events/ticket-types/${tid}`)));
      for (const tier of values.tiers) {
        if (tier.id) {
          await api.patch(`/events/ticket-types/${tier.id}`, { name: tier.name, price: tier.price, quantity: tier.quantity });
        } else {
          await api.post("/events/ticket-types", { eventId: id, name: tier.name, price: tier.price, quantity: tier.quantity });
        }
      }
      router.push("/events");
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Error al guardar los cambios");
    }
  }

  if (loading) return (
    <BackofficeShell>
      <div className="flex items-center justify-center py-32 text-slate-500 gap-2">
        <Loader2 className="size-5 animate-spin" /> Cargando evento…
      </div>
    </BackofficeShell>
  );

  if (fetchError) return (
    <BackofficeShell>
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-500">
        <AlertTriangle className="size-10 opacity-40" />
        <p className="text-sm">{fetchError}</p>
        <Button variant="outline" size="sm" onClick={() => router.back()} className="border-[#243243] text-slate-400">
          Volver
        </Button>
      </div>
    </BackofficeShell>
  );

  const tiersValues = watch("tiers");

  return (
    <BackofficeShell>
      <div className="mx-auto max-w-2xl space-y-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Editar evento</h1>
            <p className="text-sm text-slate-400">Los cambios en boletos ya vendidos pueden afectar a los compradores.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-400 hover:text-slate-200 shrink-0 self-start">
            <ArrowLeft className="size-4 mr-1.5" /> Volver
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
          {/* General info */}
          <Card className="bo-card">
            <CardHeader className="pb-3"><CardTitle className="text-sm text-slate-300">Información general</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-slate-300">Nombre del evento *</Label>
                <Input placeholder="Ej. Neon Rave 2027" {...register("title")}
                  className="bg-[#101722] border-[#243243] text-[#e8edf3] placeholder:text-slate-600" />
                {errors.title && <p className="text-xs text-red-400">{errors.title.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Descripción</Label>
                <Textarea placeholder="Describe el evento…" rows={4} {...register("description")}
                  className="bg-[#101722] border-[#243243] text-[#e8edf3] placeholder:text-slate-600" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Ubicación *</Label>
                <Input placeholder="Venue, Ciudad" {...register("location")}
                  className="bg-[#101722] border-[#243243] text-[#e8edf3] placeholder:text-slate-600" />
                {errors.location && <p className="text-xs text-red-400">{errors.location.message}</p>}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Fecha *</Label>
                  <Input type="date" {...register("date")} className="bg-[#101722] border-[#243243] text-[#e8edf3]" />
                  {errors.date && <p className="text-xs text-red-400">{errors.date.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Hora *</Label>
                  <Input type="time" {...register("time")} className="bg-[#101722] border-[#243243] text-[#e8edf3]" />
                  {errors.time && <p className="text-xs text-red-400">{errors.time.message}</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">URL de imagen de portada</Label>
                <Input type="url" placeholder="https://…" {...register("image")}
                  className="bg-[#101722] border-[#243243] text-[#e8edf3] placeholder:text-slate-600" />
                {errors.image && <p className="text-xs text-red-400">{errors.image.message}</p>}
              </div>
              {/* Tags */}
              <div className="space-y-1.5">
                <Label className="text-slate-300">Etiquetas</Label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-md border border-[#243243] bg-[#101722] min-h-[38px] items-center">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 pr-1 text-xs bg-[#1f2b3a] text-slate-300 border-[#243243]">
                      <Tag className="size-2.5" />{tag}
                      <button type="button" onClick={() => removeTag(tag)} className="ml-0.5 opacity-60 hover:opacity-100">
                        <X className="size-2.5" />
                      </button>
                    </Badge>
                  ))}
                  <input
                    className="flex-1 min-w-[120px] bg-transparent text-sm text-[#e8edf3] outline-none placeholder:text-slate-600"
                    placeholder={tags.length === 0 ? "Escribe y presiona Enter…" : "Agregar…"}
                    {...register("tagInput")} onKeyDown={handleTagKeyDown} onBlur={addTag}
                  />
                </div>
                <p className="text-xs text-slate-600">Presiona Enter o coma para agregar.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Visibilidad</Label>
                <Select value={watch("isActive") ? "true" : "false"} onValueChange={(v) => setValue("isActive", v === "true")}>
                  <SelectTrigger className="bg-[#101722] border-[#243243] text-[#e8edf3]"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0c121a] border-[#243243]">
                    <SelectItem value="false">Oculto (borrador)</SelectItem>
                    <SelectItem value="true">Visible al público</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Ticket tiers */}
          <Card className="bo-card">
            <CardHeader className="pb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-sm text-slate-300">Tipos de boleto</CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">No puedes reducir la cantidad por debajo de los boletos ya vendidos.</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm"
                onClick={() => append({ name: "", price: 0, quantity: 100, sold: 0 })}
                className="border-[#243243] text-slate-300 hover:bg-white/5 h-7 text-xs self-start">
                <Plus className="size-3.5 mr-1" /> Agregar tipo
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, i) => {
                const sold = tiersValues[i]?.sold ?? 0;
                return (
                  <div key={field.id}>
                    {i > 0 && <Separator className="mb-4 bg-[#1f2b3a]" />}
                    <div className="space-y-3">
                      {!!field.id && sold > 0 && (
                        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-md px-3 py-2">
                          <AlertTriangle className="size-3.5 shrink-0" />
                          {sold} boletos vendidos — la cantidad no puede bajar de {sold}.
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_100px_120px_auto] sm:items-end">
                        <div className="space-y-1.5">
                          <Label className="text-slate-400 text-xs">Nombre</Label>
                          <Input placeholder="General, VIP…" {...register(`tiers.${i}.name`)}
                            className="bg-[#101722] border-[#243243] text-[#e8edf3] placeholder:text-slate-600 h-8 text-sm" />
                          {errors.tiers?.[i]?.name && <p className="text-xs text-red-400">{errors.tiers[i]?.name?.message}</p>}
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-slate-400 text-xs">Precio</Label>
                          <Input type="number" min="0" step="50" {...register(`tiers.${i}.price`)}
                            className="bg-[#101722] border-[#243243] text-[#e8edf3] h-8 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-slate-400 text-xs">
                            Cantidad{sold > 0 && <span className="ml-1 text-[10px] text-slate-600 font-normal">(mín. {sold})</span>}
                          </Label>
                          <Input type="number" min={sold > 0 ? sold : 1} {...register(`tiers.${i}.quantity`)}
                            className="bg-[#101722] border-[#243243] text-[#e8edf3] h-8 text-sm" />
                          {errors.tiers?.[i]?.quantity && <p className="text-xs text-red-400">{errors.tiers[i]?.quantity?.message}</p>}
                        </div>
                        <Button type="button" variant="ghost" size="icon"
                          onClick={() => handleRemoveTier(i)} disabled={fields.length === 1}
                          className="text-red-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 justify-self-start sm:justify-self-auto">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                      {!!field.id && sold > 0 && (tiersValues[i]?.quantity ?? 0) > 0 && (
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                            <span>Ocupación actual</span>
                            <span className="tabular-nums">{sold} / {tiersValues[i]?.quantity} ({Math.round((sold / (tiersValues[i]?.quantity ?? 1)) * 100)}%)</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[#1f2b3a] overflow-hidden">
                            <div style={{ width: `${Math.min(100, Math.round((sold / (tiersValues[i]?.quantity ?? 1)) * 100))}%`, background: "#3b82f6", height: "100%", borderRadius: 9999 }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {errors.tiers && typeof errors.tiers.message === "string" && (
                <p className="text-xs text-red-400">{errors.tiers.message}</p>
              )}
            </CardContent>
          </Card>

          {serverError && (
            <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2.5">
              <AlertTriangle className="size-4 mt-0.5 shrink-0" />{serverError}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {isSubmitting ? "Guardando…" : "Guardar cambios"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}
              className="border-[#243243] text-slate-400 hover:text-slate-200 hover:bg-white/5">
              Cancelar
            </Button>
            {!isDirty && <p className="self-center text-xs text-slate-600">Sin cambios pendientes</p>}
          </div>
        </form>
      </div>
    </BackofficeShell>
  );
}
