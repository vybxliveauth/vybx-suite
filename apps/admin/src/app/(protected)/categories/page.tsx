"use client";

import { useEffect, useState } from "react";
import {
  Tags, CheckCircle2, PlusCircle, ChevronDown, ChevronUp,
  Pencil, Save, X, Trash2, ToggleLeft, ToggleRight,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, CardHeader, CardTitle,
  Input, Label,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@vybx/ui";
import { BackofficeShell } from "@/components/layout/BackofficeShell";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/page-states";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import type { CategoryRecord } from "@/lib/types";

// ── Inline edit state per row ─────────────────────────────────────────────────
interface RowEdit {
  name: string;
  icon: string;
  order: string;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate]   = useState(false);
  const [newName, setNewName]         = useState("");
  const [newIcon, setNewIcon]         = useState("");
  const [newOrder, setNewOrder]       = useState("1");
  const [newActive, setNewActive]     = useState(true);
  const [creating, setCreating]       = useState(false);

  // Inline editing
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editState, setEditState]   = useState<RowEdit>({ name: "", icon: "", order: "" });
  const [saving, setSaving]         = useState<string | null>(null);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<CategoryRecord | null>(null);
  const [deleting, setDeleting]         = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    api
      .get<CategoryRecord[]>("/categories")
      .then(setCategories)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sorted: by order then name
  const sorted = [...categories].sort((a, b) =>
    a.order !== b.order ? a.order - b.order : a.name.localeCompare(b.name)
  );

  const activeCount = categories.filter((c) => c.isActive).length;

  // ── Create ─────────────────────────────────────────────────────────────────
  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await api.post<CategoryRecord>("/categories", {
        name:     newName.trim(),
        icon:     newIcon.trim(),
        order:    Number(newOrder) || 1,
        isActive: newActive,
      });
      setCategories((prev) => [...prev, created]);
      setNewName("");
      setNewIcon("");
      setNewOrder("1");
      setNewActive(true);
      setShowCreate(false);
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  }

  // ── Inline edit open ───────────────────────────────────────────────────────
  function startEdit(cat: CategoryRecord) {
    setEditingId(cat.id);
    setEditState({ name: cat.name, icon: cat.icon, order: String(cat.order) });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState({ name: "", icon: "", order: "" });
  }

  // ── Save edit ──────────────────────────────────────────────────────────────
  async function handleSave(id: string) {
    setSaving(id);
    try {
      const updated = await api.patch<CategoryRecord>(`/categories/${id}`, {
        name:  editState.name.trim(),
        icon:  editState.icon.trim(),
        order: Number(editState.order) || 1,
      });
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...updated, updatedAt: new Date().toISOString() } : c))
      );
      setEditingId(null);
    } catch {
      // ignore
    } finally {
      setSaving(null);
    }
  }

  // ── Toggle active ──────────────────────────────────────────────────────────
  async function handleToggle(cat: CategoryRecord) {
    setSaving(cat.id);
    try {
      await api.patch(`/categories/${cat.id}`, { isActive: !cat.isActive });
      setCategories((prev) =>
        prev.map((c) =>
          c.id === cat.id
            ? { ...c, isActive: !c.isActive, updatedAt: new Date().toISOString() }
            : c
        )
      );
    } catch {
      // ignore
    } finally {
      setSaving(null);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/categories/${deleteTarget.id}`);
      setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  }

  return (
    <BackofficeShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Categorías</h1>
            <p className="text-sm text-slate-500">
              {activeCount} activas / {categories.length} total
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCreate((v) => !v)}
            className="border border-white/10 text-slate-400 hover:text-white hover:border-white/20 h-9 px-4"
          >
            {showCreate ? (
              <>
                <ChevronUp className="size-3.5 mr-1.5" />
                Cancelar
              </>
            ) : (
              <>
                <PlusCircle className="size-3.5 mr-1.5" />
                Nueva categoría
              </>
            )}
          </Button>
        </div>

        {/* Create form */}
        {showCreate && (
          <Card className="bg-[#030014]/40 border-white/5 backdrop-blur-xl shadow-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white tracking-tight">Nueva categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Nombre *</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ej. Música"
                    className="bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Icono</Label>
                  <Input
                    value={newIcon}
                    onChange={(e) => setNewIcon(e.target.value)}
                    placeholder="Emoji o código"
                    className="bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Orden</Label>
                  <Input
                    type="number"
                    min={1}
                    value={newOrder}
                    onChange={(e) => setNewOrder(e.target.value)}
                    className="bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Activa</Label>
                  <button
                    type="button"
                    onClick={() => setNewActive((v) => !v)}
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mt-1"
                  >
                    {newActive ? (
                      <ToggleRight className="size-6 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="size-6 text-white/30" />
                    )}
                    {newActive ? "Sí" : "No"}
                  </button>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button
                  size="sm"
                  disabled={creating || !newName.trim()}
                  onClick={handleCreate}
                  className="bg-violet-600 hover:bg-violet-500 text-white border-0"
                >
                  {creating ? "Creando…" : "Crear categoría"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card className="bg-[#030014]/40 border-white/5 backdrop-blur-xl shadow-2xl">
          <CardContent className="p-0">
            {error ? (
              <ErrorState message={error} onRetry={load} />
            ) : loading ? (
              <TableSkeleton rows={5} cols={6} />
            ) : sorted.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="rounded-xl border border-white/5 bg-[#030014]/60 overflow-hidden shadow-inner">
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow className="border-white/5 hover:bg-transparent text-[11px] text-slate-400 uppercase tracking-wide">
                      <TableHead className="text-slate-400 font-medium h-10">Nombre</TableHead>
                      <TableHead className="text-slate-400 font-medium h-10">Icono</TableHead>
                      <TableHead className="text-slate-400 font-medium h-10">Orden</TableHead>
                      <TableHead className="text-slate-400 font-medium h-10">Estado</TableHead>
                      <TableHead className="text-slate-400 font-medium h-10 hidden md:table-cell">Actualización</TableHead>
                      <TableHead className="text-slate-400 font-medium h-10 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((cat) => {
                      const isEditing = editingId === cat.id;
                      return (
                        <TableRow
                          key={cat.id}
                          className="border-white/5 hover:bg-white/[0.02] transition-colors"
                        >
                          <TableCell className="py-4">
                            {isEditing ? (
                              <Input
                                value={editState.name}
                                onChange={(e) =>
                                  setEditState((s) => ({ ...s, name: e.target.value }))
                                }
                                className="h-7 w-36 bg-white/5 border-white/10 text-slate-200 text-xs"
                              />
                            ) : (
                              <span className="text-slate-200 font-medium">{cat.name}</span>
                            )}
                          </TableCell>
                          <TableCell className="py-4">
                            {isEditing ? (
                              <Input
                                value={editState.icon}
                                onChange={(e) =>
                                  setEditState((s) => ({ ...s, icon: e.target.value }))
                                }
                                className="h-7 w-20 bg-white/5 border-white/10 text-slate-200 text-xs"
                              />
                            ) : (
                              <span className="text-lg">{cat.icon}</span>
                            )}
                          </TableCell>
                          <TableCell className="py-4">
                            {isEditing ? (
                              <Input
                                type="number"
                                min={1}
                                value={editState.order}
                                onChange={(e) =>
                                  setEditState((s) => ({ ...s, order: e.target.value }))
                                }
                                className="h-7 w-16 bg-white/5 border-white/10 text-slate-200 text-xs"
                              />
                            ) : (
                              <span className="text-slate-400 tabular-nums">{cat.order}</span>
                            )}
                          </TableCell>
                          <TableCell className="py-4">
                            <button
                              disabled={saving === cat.id}
                              onClick={() => handleToggle(cat)}
                              className="disabled:opacity-40"
                              title={cat.isActive ? "Desactivar" : "Activar"}
                            >
                              {cat.isActive ? (
                                <ToggleRight className="size-5 text-emerald-400" />
                              ) : (
                                <ToggleLeft className="size-5 text-slate-500" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell className="py-4 text-slate-500 text-xs hidden md:table-cell whitespace-nowrap">
                            {fmtDate(cat.updatedAt)}
                          </TableCell>
                          <TableCell className="py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isEditing ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={saving === cat.id}
                                    onClick={() => handleSave(cat.id)}
                                    className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                  >
                                    <Save className="size-3.5 mr-1" />
                                    Guardar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={cancelEdit}
                                    className="h-7 px-2 text-xs text-slate-500 hover:text-slate-200"
                                  >
                                    <X className="size-3.5" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => startEdit(cat)}
                                    className="h-7 px-2 text-xs text-slate-500 hover:text-slate-200"
                                  >
                                    <Pencil className="size-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setDeleteTarget(cat)}
                                    className="h-7 px-2 text-xs text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="bg-[#030014]/95 backdrop-blur-xl border-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Eliminar categoría</DialogTitle>
            <DialogDescription className="text-slate-400">
              La categoría{" "}
              <span className="text-white font-medium">
                {deleteTarget?.icon} {deleteTarget?.name}
              </span>{" "}
              será eliminada permanentemente. Los eventos asociados quedarán sin categoría.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              className="border-white/10 text-slate-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? "Eliminando…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BackofficeShell>
  );
}
