"use client";

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Loader2, Save, ImagePlus } from "lucide-react";
import {
  Button,
  Input,
  Label,
  Textarea,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from "@vybx/ui";
import { PromoterShell } from "@/components/layout/PromoterShell";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { api } from "@/lib/api";
import { tracker, AnalyticsEvents } from "@/lib/analytics";
import { useActiveCategories } from "@/lib/queries";

const tierSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  price: z.coerce.number().min(0, "Precio inválido"),
  quantity: z.coerce.number().min(1, "Mínimo 1"),
});

const schema = z.object({
  title: z.string().min(3, "Mínimo 3 caracteres"),
  description: z.string().optional(),
  image: z.string().url("URL inválida").or(z.literal("")).optional(),
  location: z.string().min(2, "Ubicación requerida"),
  date: z.string().min(1, "Fecha requerida"),
  time: z.string().min(1, "Hora requerida"),
  categoryId: z.string().uuid("Categoría inválida").or(z.literal("")).optional(),
  isActive: z.boolean(),
  tiers: z.array(tierSchema).min(1, "Agrega al menos un tipo de boleto"),
});

type FormValues = z.infer<typeof schema>;

interface CreatedEvent {
  id: string;
}

export default function NewEventPage() {
  const router = useRouter();
  const categoriesQuery = useActiveCategories();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isUploadingFlyer, setIsUploadingFlyer] = useState(false);
  const [localFlyerPreview, setLocalFlyerPreview] = useState<string | null>(null);
  const [flyerPreviewFailed, setFlyerPreviewFailed] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      isActive: false,
      image: "",
      categoryId: "",
      tiers: [{ name: "General", price: 350, quantity: 200 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "tiers" });
  const imageValue = watch("image");
  const flyerPreview = useMemo(
    () => localFlyerPreview || (imageValue && imageValue.trim().length > 0 ? imageValue : ""),
    [imageValue, localFlyerPreview],
  );

  useEffect(() => {
    setFlyerPreviewFailed(false);
  }, [flyerPreview]);

  useEffect(() => {
    return () => {
      if (localFlyerPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(localFlyerPreview);
      }
    };
  }, [localFlyerPreview]);

  async function uploadFlyerToCloudinary(file: File) {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error(
        "Falta configurar Cloudinary. Define NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME y NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.",
      );
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json()) as { secure_url?: string; error?: { message?: string } };
    if (!response.ok || !payload.secure_url) {
      throw new Error(payload.error?.message || "No se pudo subir el flyer.");
    }

    return payload.secure_url;
  }

  async function handleFlyerFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      setServerError("El flyer debe ser una imagen (jpg, png, webp, etc).");
      event.target.value = "";
      return;
    }

    setServerError(null);
    if (localFlyerPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(localFlyerPreview);
    }
    setLocalFlyerPreview(URL.createObjectURL(selected));
    setIsUploadingFlyer(true);

    try {
      const uploadedUrl = await uploadFlyerToCloudinary(selected);
      setValue("image", uploadedUrl, { shouldDirty: true, shouldValidate: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "No se pudo subir el flyer.");
    } finally {
      setIsUploadingFlyer(false);
      event.target.value = "";
    }
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const dateTime = new Date(`${values.date}T${values.time}`).toISOString();

      // Step 1 — create the event
      const event = await api.post<CreatedEvent>("/events", {
        title: values.title,
        description: values.description || undefined,
        image: values.image || undefined,
        location: values.location,
        date: dateTime,
        categoryId: values.categoryId || null,
        isActive: values.isActive,
      });

      // Step 2 — create ticket types sequentially
      for (const tier of values.tiers) {
        await api.post("/events/ticket-types", {
          eventId: event.id,
          name: tier.name,
          price: tier.price,
          quantity: tier.quantity,
        });
      }

      tracker.track(AnalyticsEvents.PROMOTER_EVENT_CREATED, {
        eventId: event.id,
        isActive: values.isActive,
        tierCount: values.tiers.length,
        hasCategory: Boolean(values.categoryId),
      });
      if (values.isActive) {
        tracker.track(AnalyticsEvents.PROMOTER_EVENT_PUBLISHED, {
          eventId: event.id,
          source: "create",
          tierCount: values.tiers.length,
        });
      }

      router.push("/events");
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Error al crear el evento");
    }
  }

  return (
    <PromoterShell
      breadcrumb={
        <PageBreadcrumb
          items={[
            { label: "Eventos", href: "/events" },
            { label: "Nuevo evento" },
          ]}
        />
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-xl font-semibold">Crear evento</h1>
          <p className="text-sm text-muted-foreground">Completa los datos del nuevo evento</p>
        </div>

        {/* Basic info */}
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
                rows={3}
                {...register("description")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="flyer">Flyer del evento</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  id="flyer"
                  type="file"
                  accept="image/*"
                  onChange={handleFlyerFileChange}
                  disabled={isUploadingFlyer || isSubmitting}
                  className="cursor-pointer"
                />
                <div className="text-xs text-muted-foreground">
                  {isUploadingFlyer ? "Subiendo flyer..." : "Puedes subir archivo o pegar una URL abajo."}
                </div>
              </div>

              <div className="space-y-1.5">
                <Input id="image" type="url" placeholder="https://..." {...register("image")} />
                {errors.image && <p className="text-xs text-destructive">{errors.image.message}</p>}
              </div>

              {flyerPreview && !flyerPreviewFailed ? (
                <div className="overflow-hidden rounded-md border border-border/60 bg-card/50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={flyerPreview}
                    alt="Vista previa del flyer"
                    className="h-40 w-full object-cover"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onError={() => setFlyerPreviewFailed(true)}
                  />
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border/60 bg-card/30 p-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <ImagePlus className="size-4" />
                    {flyerPreviewFailed
                      ? "No se pudo cargar la vista previa del flyer."
                      : "Sin flyer cargado."}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location">Ubicación *</Label>
              <Input id="location" placeholder="Venue, Ciudad" {...register("location")} />
              {errors.location && <p className="text-xs text-destructive">{errors.location.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select
                value={watch("categoryId") || "__none__"}
                onValueChange={(value) =>
                  setValue("categoryId", value === "__none__" ? "" : value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                disabled={categoriesQuery.isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={categoriesQuery.isLoading ? "Cargando categorías..." : "Sin categoría"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin categoría</SelectItem>
                  {(categoriesQuery.data ?? []).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId && (
                <p className="text-xs text-destructive">{errors.categoryId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Label>Visibilidad inicial</Label>
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
              <p className="text-xs text-muted-foreground">
                El evento también requiere aprobación del equipo de VybeTickets.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Ticket tiers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Tipos de boleto</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ name: "", price: 0, quantity: 100 })}
            >
              <Plus className="size-4" />
              Agregar tipo
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, i) => (
              <div key={field.id}>
                {i > 0 && <Separator className="mb-4" />}
                <div className="grid grid-cols-2 sm:grid-cols-[1fr_100px_100px_auto] gap-3 items-end">
                  <div className="space-y-1.5">
                    <Label>Nombre</Label>
                    <Input placeholder="General, VIP..." {...register(`tiers.${i}.name`)} />
                    {errors.tiers?.[i]?.name && (
                      <p className="text-xs text-destructive">{errors.tiers[i].name?.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Precio (MXN)</Label>
                    <Input type="number" min="0" step="50" {...register(`tiers.${i}.price`)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cantidad</Label>
                    <Input type="number" min="1" {...register(`tiers.${i}.quantity`)} />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(i)}
                    disabled={fields.length === 1}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
            {errors.tiers && typeof errors.tiers.message === "string" && (
              <p className="text-xs text-destructive">{errors.tiers.message}</p>
            )}
          </CardContent>
        </Card>

        {serverError && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3">
            {serverError}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isSubmitting ? "Creando..." : "Guardar evento"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </PromoterShell>
  );
}
