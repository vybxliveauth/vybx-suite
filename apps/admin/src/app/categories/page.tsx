"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  FolderTree,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@vybx/ui";
import { PromoterShell } from "@/components/layout/PromoterShell";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { useAuthUser } from "@/lib/auth";
import {
  useAdminCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "@/lib/queries";

export default function CategoriesPage() {
  const user = useAuthUser();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const categoriesQuery = useAdminCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [order, setOrder] = useState("0");
  const [isActiveInput, setIsActiveInput] = useState("true");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const categories = categoriesQuery.data ?? [];
  const stats = useMemo(
    () => ({
      total: categories.length,
      active: categories.filter((item) => item.isActive).length,
      inactive: categories.filter((item) => !item.isActive).length,
    }),
    [categories]
  );

  async function handleCreateCategory(event: FormEvent) {
    event.preventDefault();
    if (!isSuperAdmin) {
      setError("Solo SUPER_ADMIN puede crear categorías.");
      return;
    }

    const normalizedName = name.trim();
    if (normalizedName.length < 2) {
      setError("El nombre de la categoría debe tener al menos 2 caracteres.");
      return;
    }

    setError(null);
    setNotice(null);
    try {
      await createCategory.mutateAsync({
        name: normalizedName,
        icon: icon.trim() || undefined,
        order: Number.isFinite(Number(order)) ? Number(order) : 0,
        isActive: isActiveInput === "true",
      });
      setName("");
      setIcon("");
      setOrder("0");
      setIsActiveInput("true");
      setNotice("Categoría creada correctamente.");
    } catch (mutationError) {
      setError((mutationError as Error).message || "No se pudo crear la categoría.");
    }
  }

  async function handleToggleActive(categoryId: string, nextIsActive: boolean) {
    if (!isSuperAdmin) {
      setError("Solo SUPER_ADMIN puede editar categorías.");
      return;
    }

    setActingId(`toggle:${categoryId}`);
    setError(null);
    setNotice(null);
    try {
      await updateCategory.mutateAsync({
        id: categoryId,
        payload: { isActive: nextIsActive },
      });
      setNotice(nextIsActive ? "Categoría activada." : "Categoría desactivada.");
    } catch (mutationError) {
      setError((mutationError as Error).message || "No se pudo actualizar la categoría.");
    } finally {
      setActingId(null);
    }
  }

  async function handleDelete(categoryId: string, categoryName: string) {
    if (!isSuperAdmin) {
      setError("Solo SUPER_ADMIN puede eliminar categorías.");
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar la categoría "${categoryName}"?\n\nSi tiene eventos asignados, el backend bloqueará la operación.`
    );
    if (!confirmed) return;

    setActingId(`delete:${categoryId}`);
    setError(null);
    setNotice(null);
    try {
      await deleteCategory.mutateAsync(categoryId);
      setNotice("Categoría eliminada correctamente.");
    } catch (mutationError) {
      setError((mutationError as Error).message || "No se pudo eliminar la categoría.");
    } finally {
      setActingId(null);
    }
  }

  return (
    <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Categorías" }]} />}>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <FolderTree className="size-5 text-primary" />
              Categorías
            </h1>
            <p className="text-sm text-muted-foreground">
              Crea y administra las categorías disponibles para los eventos.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void categoriesQuery.refetch()}
            disabled={categoriesQuery.isFetching}
          >
            <RefreshCw
              className={`size-3.5 mr-1.5 ${categoriesQuery.isFetching ? "animate-spin" : ""}`}
            />
            Actualizar
          </Button>
        </div>

        {!isSuperAdmin && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Solo <strong>SUPER_ADMIN</strong> puede crear/editar/eliminar categorías.
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {notice && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {notice}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="kpi-card">
            <CardHeader className="pb-2">
              <CardDescription>Total</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="kpi-card">
            <CardHeader className="pb-2">
              <CardDescription>Activas</CardDescription>
              <CardTitle className="text-2xl text-emerald-300">{stats.active}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="kpi-card">
            <CardHeader className="pb-2">
              <CardDescription>Inactivas</CardDescription>
              <CardTitle className="text-2xl text-amber-300">{stats.inactive}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nueva categoría</CardTitle>
            <CardDescription>
              Estas categorías se mostrarán al crear o editar eventos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCategory} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="category-name">Nombre *</Label>
                <Input
                  id="category-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ej. Música en vivo"
                  disabled={!isSuperAdmin || createCategory.isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category-icon">Icono (opcional)</Label>
                <Input
                  id="category-icon"
                  value={icon}
                  onChange={(event) => setIcon(event.target.value)}
                  placeholder="music"
                  disabled={!isSuperAdmin || createCategory.isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category-order">Orden</Label>
                <Input
                  id="category-order"
                  type="number"
                  value={order}
                  onChange={(event) => setOrder(event.target.value)}
                  disabled={!isSuperAdmin || createCategory.isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select
                  value={isActiveInput}
                  onValueChange={setIsActiveInput}
                  disabled={!isSuperAdmin || createCategory.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Activa</SelectItem>
                    <SelectItem value="false">Inactiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-4 flex justify-end">
                <Button type="submit" disabled={!isSuperAdmin || createCategory.isPending}>
                  {createCategory.isPending ? (
                    <Loader2 className="size-4 mr-1.5 animate-spin" />
                  ) : (
                    <Plus className="size-4 mr-1.5" />
                  )}
                  Crear categoría
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Catálogo actual</CardTitle>
            <CardDescription>
              Puedes activar/desactivar o eliminar categorías sin eventos asociados.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Icono</TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoriesQuery.isLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={5} className="py-3">
                        <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      No hay categorías creadas todavía.
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {category.icon || "—"}
                      </TableCell>
                      <TableCell>{category.order}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            category.isActive
                              ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
                              : "text-amber-300 border-amber-500/30 bg-amber-500/10"
                          }
                        >
                          {category.isActive ? "Activa" : "Inactiva"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!isSuperAdmin || actingId === `toggle:${category.id}`}
                            onClick={() =>
                              void handleToggleActive(category.id, !category.isActive)
                            }
                          >
                            {actingId === `toggle:${category.id}` && (
                              <Loader2 className="size-3.5 mr-1 animate-spin" />
                            )}
                            {category.isActive ? "Desactivar" : "Activar"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={!isSuperAdmin || actingId === `delete:${category.id}`}
                            onClick={() => void handleDelete(category.id, category.name)}
                          >
                            {actingId === `delete:${category.id}` ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 text-xs text-muted-foreground flex items-start gap-2">
          <AlertTriangle className="size-4 mt-0.5 shrink-0" />
          Si una categoría está asignada a eventos, el backend impedirá eliminarla hasta que se
          reasigne o se desactive.
        </div>
      </div>
    </PromoterShell>
  );
}
