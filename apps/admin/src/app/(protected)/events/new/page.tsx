"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Loader2, Save, ArrowLeft } from "lucide-react";
import {
  Button, Input, Label, Textarea, Card, CardContent, CardHeader, CardTitle,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Separator,
} from "@vybx/ui";
import { BackofficeShell } from "@/components/layout/BackofficeShell";
import { api } from "@/lib/api";

const tierSchema = z.object({
  name:     z.string().min(1, "Nombre requerido"),
  price:    z.coerce.number().min(0, "Precio inválido"),
  quantity: z.coerce.number().min(1, "Mínimo 1"),
});

const schema = z.object({
  title:       z.string().min(3, "Mínimo 3 caracteres"),
  description: z.string().optional(),
  location:    z.string().min(2, "Ubicación requerida"),
  date:        z.string().min(1, "Fecha requerida"),
  time:        z.string().min(1, "Hora requerida"),
  isActive:    z.boolean(),
  autoApprove: z.boolean(),
  tiers:       z.array(tierSchema).min(1, "Agrega al menos un tipo de boleto"),
});

type FormValues = z.infer<typeof schema>;

export default function NewEventAdminPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, control, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        isActive: true,
        autoApprove: true,
        tiers: [{ name: "General", price: 500, quantity: 200 }],
      },
    });

  const { fields, append, remove } = useFieldArray({ control, name: "tiers" });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const dateTime = new Date(`${values.date}T${values.time}`).toISOString();
      const event = await api.post<{ id: string }>("/events", {
        title:       values.title,
        description: values.description || undefined,
        location:    values.location,
        date:        dateTime,
        isActive:    values.isActive,
      });

      for (const tier of values.tiers) {
        await api.post("/events/ticket-types", {
          eventId:  event.id,
          name:     tier.name,
          price:    tier.price,
          quantity: tier.quantity,
        });
      }

      if (values.autoApprove) {
        await api.patch(`/events/${event.id}/approval`, { status: "APPROVED" });
      }

      router.push("/events");
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Error al crear el evento");
    }
  }

  return (
    <BackofficeShell>
      <div className="mx-auto max-w-2xl space-y-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Nuevo evento</h1>
            <p className="text-sm text-slate-400">Crea un evento directamente desde el backoffice.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-400 hover:text-slate-200 shrink-0 self-start">
            <ArrowLeft className="size-4 mr-1.5" /> Volver
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
          {/* General info */}
          <Card className="bo-card">
            <CardHeader className="pb-3"><CardTitle className="text-sm text-slate-300">Información general</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-slate-300">Nombre del evento *</Label>
                <Input id="title" placeholder="Ej. Neon Rave 2027" {...register("title")}
                  className="bg-[#101722] border-[#243243] text-[#e8edf3] placeholder:text-slate-600" />
                {errors.title && <p className="text-xs text-red-400">{errors.title.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-slate-300">Descripción</Label>
                <Textarea id="description" placeholder="Describe el evento…" rows={3} {...register("description")}
                  className="bg-[#101722] border-[#243243] text-[#e8edf3] placeholder:text-slate-600" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location" className="text-slate-300">Ubicación *</Label>
                <Input id="location" placeholder="Venue, Ciudad" {...register("location")}
                  className="bg-[#101722] border-[#243243] text-[#e8edf3] placeholder:text-slate-600" />
                {errors.location && <p className="text-xs text-red-400">{errors.location.message}</p>}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="date" className="text-slate-300">Fecha *</Label>
                  <Input id="date" type="date" {...register("date")}
                    className="bg-[#101722] border-[#243243] text-[#e8edf3]" />
                  {errors.date && <p className="text-xs text-red-400">{errors.date.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="time" className="text-slate-300">Hora *</Label>
                  <Input id="time" type="time" {...register("time")}
                    className="bg-[#101722] border-[#243243] text-[#e8edf3]" />
                  {errors.time && <p className="text-xs text-red-400">{errors.time.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Visibilidad</Label>
                  <Select value={watch("isActive") ? "true" : "false"} onValueChange={(v) => setValue("isActive", v === "true")}>
                    <SelectTrigger className="bg-[#101722] border-[#243243] text-[#e8edf3]"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#0c121a] border-[#243243]">
                      <SelectItem value="true">Visible al público</SelectItem>
                      <SelectItem value="false">Oculto (borrador)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Aprobación</Label>
                  <Select value={watch("autoApprove") ? "true" : "false"} onValueChange={(v) => setValue("autoApprove", v === "true")}>
                    <SelectTrigger className="bg-[#101722] border-[#243243] text-[#e8edf3]"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#0c121a] border-[#243243]">
                      <SelectItem value="true">Auto-aprobar</SelectItem>
                      <SelectItem value="false">Dejar pendiente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ticket tiers */}
          <Card className="bo-card">
            <CardHeader className="pb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-sm text-slate-300">Tipos de boleto</CardTitle>
              <Button type="button" variant="outline" size="sm"
                onClick={() => append({ name: "", price: 0, quantity: 100 })}
                className="border-[#243243] text-slate-300 hover:bg-white/5 h-7 text-xs self-start">
                <Plus className="size-3.5 mr-1" /> Agregar tipo
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, i) => (
                <div key={field.id}>
                  {i > 0 && <Separator className="mb-4 bg-[#1f2b3a]" />}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_100px_100px_auto] sm:items-end">
                    <div className="space-y-1.5">
                      <Label className="text-slate-400 text-xs">Nombre</Label>
                      <Input placeholder="General, VIP…" {...register(`tiers.${i}.name`)}
                        className="bg-[#101722] border-[#243243] text-[#e8edf3] placeholder:text-slate-600 h-8 text-sm" />
                      {errors.tiers?.[i]?.name && <p className="text-xs text-red-400">{errors.tiers[i].name?.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-400 text-xs">Precio</Label>
                      <Input type="number" min="0" step="50" {...register(`tiers.${i}.price`)}
                        className="bg-[#101722] border-[#243243] text-[#e8edf3] h-8 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-400 text-xs">Cantidad</Label>
                      <Input type="number" min="1" {...register(`tiers.${i}.quantity`)}
                        className="bg-[#101722] border-[#243243] text-[#e8edf3] h-8 text-sm" />
                    </div>
                    <Button type="button" variant="ghost" size="icon"
                      onClick={() => remove(i)} disabled={fields.length === 1}
                      className="text-red-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 justify-self-start sm:justify-self-auto">
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {errors.tiers && typeof errors.tiers.message === "string" && (
                <p className="text-xs text-red-400">{errors.tiers.message}</p>
              )}
            </CardContent>
          </Card>

          {serverError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
              {serverError}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {isSubmitting ? "Creando…" : "Crear evento"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}
              className="border-[#243243] text-slate-400 hover:text-slate-200 hover:bg-white/5">
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </BackofficeShell>
  );
}
