import { useState, useEffect, useRef, useCallback } from "react";
import { router, usePage } from "@inertiajs/react";
import { toast } from "sonner";

import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Badge } from "@/Components/ui/badge";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/Components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/Components/ui/table";
import {
    ArrowRightLeft,
    Download,
    FileSpreadsheet,
    History,
    Maximize2,
    Minimize2,
    Pencil,
    Plus,
    Trash2,
    Upload,
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/Components/ui/tooltip";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/Components/ui/dropdown-menu";
import { REMARK_LABELS, REMARK_VARIANTS } from "./lockerConstants";
import LockerFormDialog from "./components/LockerFormDialog";
import DeleteConfirmDialog from "./components/DeleteConfirmDialog";
import HistoryDialog from "./components/HistoryDialog";
import TransferDialog from "./components/TransferDialog";
import UploadDialog from "./components/UploadDialog";
import UploadErrorsAlertDialog from "./components/UploadErrorsAlertDialog";

export default function LockerPageLayout({
    lockers,
    filters,
    remarkOptions,
    statusCounts = {},
    config,
}) {
    const { props } = usePage();
    const uploadResult = props.upload_result ?? null;

    // ── filter state ─────────────────────────────────────────────────────────
    const [search, setSearch] = useState(filters.search ?? "");
    const [filterRemark, setFilterRemark] = useState(filters.remarks ?? "");

    // ── dialog state ─────────────────────────────────────────────────────────
    const [formDialog, setFormDialog] = useState(null);
    const [deleteRow, setDeleteRow] = useState(null);
    const [transferRow, setTransferRow] = useState(null);
    const [historyRow, setHistoryRow] = useState(null);
    const [showUpload, setShowUpload] = useState(false);
    const [uploadErrors, setUploadErrors] = useState(null);

    // ── fullscreen ────────────────────────────────────────────────────────────
    const tableAreaRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [portalContainer, setPortalContainer] = useState(null);

    useEffect(() => {
        const handler = () => {
            const fs = !!document.fullscreenElement;
            setIsFullscreen(fs);
            setPortalContainer(fs ? tableAreaRef.current : null);
        };
        document.addEventListener("fullscreenchange", handler);
        return () => document.removeEventListener("fullscreenchange", handler);
    }, []);

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            tableAreaRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    // ── upload result ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!uploadResult) return;
        if (uploadResult.success_count > 0) {
            toast.success(
                `Upload complete — ${uploadResult.success_count} row(s) imported ` +
                    `(${uploadResult.created_count} created, ${uploadResult.updated_count} updated).`,
            );
        }
        if (uploadResult.errors?.length > 0) {
            setUploadErrors(uploadResult.errors);
        }
    }, [uploadResult]);

    // ── employee search ───────────────────────────────────────────────────────
    const loadEmployees = useCallback(async (searchTerm = "", page = 1) => {
        try {
            const res = await fetch(
                `/api/employees/search?search=${encodeURIComponent(searchTerm)}&page=${page}`,
                {
                    headers: {
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                    },
                    credentials: "same-origin",
                },
            );
            if (!res.ok) throw new Error();
            const data = await res.json();
            return { options: data.options, hasMore: data.hasMore };
        } catch {
            toast.error("Failed to load employees");
            return { options: [], hasMore: false };
        }
    }, []);

    // ── filters ───────────────────────────────────────────────────────────────
    function applyFilters(overrides = {}) {
        router.get(
            route(config.routes.index),
            { search, remarks: filterRemark, ...overrides },
            { preserveScroll: true, replace: true },
        );
    }

    // ── delete ────────────────────────────────────────────────────────────────
    function handleDelete() {
        if (!deleteRow) return;
        router.delete(route(config.routes.destroy, deleteRow.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success("Locker deleted successfully");
                setDeleteRow(null);
            },
            onError: () => {
                toast.error("Failed to delete locker");
                setDeleteRow(null);
            },
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <AuthenticatedLayout>
            <div className="p-6 max-w-7xl mx-auto space-y-4">
                {/* ── Page header row: title + action buttons ── */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {config.title}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {config.subtitle}
                        </p>
                    </div>

                    {/* Action buttons — top-right, icon-only with tooltips */}
                    <TooltipProvider delayDuration={200}>
                        <div className="flex items-center gap-1 shrink-0">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="icon"
                                        onClick={() =>
                                            setFormDialog({ row: null })
                                        }
                                        aria-label="Add Locker"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Add Locker</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="icon"
                                        variant="secondary"
                                        onClick={() => setShowUpload(true)}
                                        aria-label="Upload Excel"
                                    >
                                        <Upload className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Upload Excel</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        aria-label="Download Template"
                                        asChild
                                    >
                                        <a href={route(config.routes.template)}>
                                            <Download className="h-4 w-4" />
                                        </a>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    Download Template
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <DropdownMenu>
                                    <TooltipTrigger asChild>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                aria-label="Export Excel"
                                            >
                                                <FileSpreadsheet className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Export Excel
                                    </TooltipContent>
                                    <DropdownMenuContent align="end" container={portalContainer}>
                                        <DropdownMenuLabel>
                                            Export by Status
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem asChild>
                                            <a
                                                href={route(
                                                    config.routes.export,
                                                )}
                                            >
                                                All
                                            </a>
                                        </DropdownMenuItem>
                                        {remarkOptions.map((r) => (
                                            <DropdownMenuItem
                                                key={r.value}
                                                asChild
                                            >
                                                <a
                                                    href={`${route(config.routes.export)}?remarks=${r.value}`}
                                                >
                                                    {r.label}
                                                </a>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </Tooltip>
                        </div>
                    </TooltipProvider>
                </div>

                {/* ── Status count pills ── */}
                {remarkOptions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {remarkOptions.map((r) => (
                            <Badge
                                key={r.value}
                                variant={REMARK_VARIANTS[r.value] ?? "secondary"}
                                className="px-3 py-1 text-sm gap-1.5"
                            >
                                {r.label}
                                <span className="font-bold">
                                    {statusCounts[r.value] ?? 0}
                                </span>
                            </Badge>
                        ))}
                    </div>
                )}

                {/* ── Table area (fullscreen target) ── */}
                <div
                    ref={tableAreaRef}
                    className={
                        isFullscreen
                            ? "bg-background p-6 flex flex-col gap-4 h-full overflow-auto"
                            : "space-y-3"
                    }
                >
                    {/* Filter bar: search + status + search btn | per-page + fullscreen */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Input
                            placeholder="Search locker or employee…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) =>
                                e.key === "Enter" && applyFilters()
                            }
                            className="w-64"
                        />
                        <Select
                            value={
                                filterRemark !== ""
                                    ? String(filterRemark)
                                    : "all"
                            }
                            onValueChange={(v) => {
                                const val = v === "all" ? "" : Number(v);
                                setFilterRemark(val);
                                applyFilters({ remarks: val || "" });
                            }}
                        >
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent container={portalContainer}>
                                <SelectItem value="all">All Status</SelectItem>
                                {remarkOptions.map((r) => (
                                    <SelectItem
                                        key={r.value}
                                        value={String(r.value)}
                                    >
                                        {r.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            onClick={() => applyFilters()}
                        >
                            Search
                        </Button>

                        {/* Right side: per-page + fullscreen toggle */}
                        <div className="ml-auto flex items-center gap-2">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                                Rows per page
                            </span>
                            <Select
                                value={String(filters.per_page ?? 10)}
                                onValueChange={(v) =>
                                    router.get(
                                        route(config.routes.index),
                                        {
                                            ...filters,
                                            per_page: Number(v),
                                            page: 1,
                                        },
                                        { preserveScroll: true, replace: true },
                                    )
                                }
                            >
                                <SelectTrigger className="w-20 h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent container={portalContainer}>
                                    {[10, 15, 25, 50, 100].map((n) => (
                                        <SelectItem key={n} value={String(n)}>
                                            {n}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                title={
                                    isFullscreen
                                        ? "Exit fullscreen"
                                        : "Fullscreen"
                                }
                                onClick={toggleFullscreen}
                            >
                                {isFullscreen ? (
                                    <Minimize2 className="h-4 w-4" />
                                ) : (
                                    <Maximize2 className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Locker No</TableHead>
                                    <TableHead>Employee ID</TableHead>
                                    <TableHead>Employee Name</TableHead>
                                    <TableHead>Passcode</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Notes</TableHead>
                                    <TableHead>Created By</TableHead>
                                    <TableHead className="w-[120px]">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {lockers.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={8}
                                            className="h-24 text-center text-muted-foreground"
                                        >
                                            No records found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    lockers.data.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell className="font-medium">
                                                {row.locker_no}
                                            </TableCell>
                                            <TableCell>
                                                {row.employ_id ?? (
                                                    <span className="text-muted-foreground">
                                                        —
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {row.employee_name ?? (
                                                    <span className="text-muted-foreground">
                                                        —
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {row.passcode ?? (
                                                    <span className="text-muted-foreground">
                                                        —
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        REMARK_VARIANTS[
                                                            row.remarks
                                                        ] ?? "secondary"
                                                    }
                                                >
                                                    {REMARK_LABELS[
                                                        row.remarks
                                                    ] ?? row.remarks}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm max-w-[180px] truncate" title={row.notes ?? ""}>
                                                {row.notes ?? (
                                                    <span className="text-muted-foreground">
                                                        —
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {row.created_by}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                        title="Edit"
                                                        onClick={() =>
                                                            setFormDialog({
                                                                row,
                                                            })
                                                        }
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                                        title="Transfer"
                                                        onClick={() =>
                                                            setTransferRow(row)
                                                        }
                                                    >
                                                        <ArrowRightLeft className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                        title="History"
                                                        onClick={() =>
                                                            setHistoryRow(row)
                                                        }
                                                    >
                                                        <History className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        title="Delete"
                                                        onClick={() =>
                                                            setDeleteRow(row)
                                                        }
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-muted-foreground">
                            {lockers.total === 0
                                ? "No records found."
                                : `Showing ${lockers.from}–${lockers.to} of ${lockers.total} records`}
                        </p>
                        <div className="flex flex-wrap gap-1">
                            {lockers.links.map((link, i) => (
                                <Button
                                    key={i}
                                    variant={
                                        link.active ? "default" : "outline"
                                    }
                                    size="sm"
                                    disabled={!link.url}
                                    onClick={() =>
                                        link.url &&
                                        router.get(
                                            link.url,
                                            {},
                                            { preserveScroll: true },
                                        )
                                    }
                                    dangerouslySetInnerHTML={{
                                        __html: link.label,
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
                {/* end tableAreaRef */}

                {/* ── Dialogs (outside fullscreen div so they render above it) ── */}
                <LockerFormDialog
                    open={!!formDialog}
                    onClose={() => setFormDialog(null)}
                    row={formDialog?.row ?? null}
                    loadEmployees={loadEmployees}
                    storeRoute={config.routes.store}
                    updateRoute={config.routes.update}
                />
                <DeleteConfirmDialog
                    open={!!deleteRow}
                    onClose={() => setDeleteRow(null)}
                    onConfirm={handleDelete}
                    lockerNo={deleteRow?.locker_no}
                />
                <TransferDialog
                    open={!!transferRow}
                    onClose={() => setTransferRow(null)}
                    row={transferRow}
                    transferRouteName={config.routes.transfer}
                    availableApi={config.availableApi}
                />
                <HistoryDialog
                    open={!!historyRow}
                    onClose={() => setHistoryRow(null)}
                    row={historyRow}
                    historyRouteName={config.routes.history}
                />
                <UploadDialog
                    open={showUpload}
                    onClose={() => setShowUpload(false)}
                    uploadRouteName={config.routes.upload}
                    templateRouteName={config.routes.template}
                />
                <UploadErrorsAlertDialog
                    errors={uploadErrors}
                    onClose={() => setUploadErrors(null)}
                />
            </div>
        </AuthenticatedLayout>
    );
}
