// resources/js/Pages/Lockers/Index.jsx

import { useState } from "react";
import { router, useForm, usePage } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox"; // Import your Combobox component

const REMARK_ACTIVE   = 1;
const REMARK_VACANT   = 2;
const REMARK_INACTIVE = 3;

const REMARK_LABELS = {
    [REMARK_ACTIVE]:   "Active",
    [REMARK_VACANT]:   "Vacant",
    [REMARK_INACTIVE]: "Inactive",
};

const remarkVariant = {
    [REMARK_ACTIVE]:   "default",
    [REMARK_VACANT]:   "secondary",
    [REMARK_INACTIVE]: "destructive",
};

export default function LockersIndex({ lockers, filters, remarkOptions }) {
    const { props } = usePage();
    const uploadResult = props.upload_result ?? null;

    const [search, setSearch] = useState(filters.search ?? "");
    const [filterRemark, setFilterRemark] = useState(filters.remarks ?? "");
    const [showCreate, setShowCreate] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [editRow, setEditRow] = useState(null);
    const [transferRow, setTransferRow] = useState(null);

    // Show toast for upload result if present
    if (uploadResult) {
        if (uploadResult.success_count > 0) {
            toast.success(
                `Upload complete — ${uploadResult.success_count} row(s) imported.`,
            );
        }
        if (uploadResult.errors.length > 0) {
            toast.error(
                `${uploadResult.errors.length} error(s) found during upload`,
            );
        }
    }

    // Server-side employee search function for Combobox
    const loadEmployees = async (searchTerm = "", page = 1) => {
        try {
            const response = await fetch(
                `/api/employees/search?search=${encodeURIComponent(searchTerm)}&page=${page}`,
                {
                    headers: {
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                    },
                    credentials: "same-origin",
                },
            );

            if (!response.ok) {
                throw new Error("Failed to load employees");
            }

            const data = await response.json();
            return {
                options: data.options,
                hasMore: data.hasMore,
            };
        } catch (error) {
            console.error("Error loading employees:", error);
            toast.error("Failed to load employees");
            return {
                options: [],
                hasMore: false,
            };
        }
    };

    // ── search / filter ──────────────────────────────────────────────────────
    function applyFilters(overrides = {}) {
        router.get(
            route("lockers.index"),
            {
                search: search,
                remarks: filterRemark,
                ...overrides,
            },
            { preserveScroll: true, replace: true },
        );
    }

    // ── forms ────────────────────────────────────────────────────────────────
    // Server-side available locker search for transfer combobox
    const loadAvailableLockers = async (searchTerm = "") => {
        try {
            const response = await fetch(
                `/api/lockers/available?search=${encodeURIComponent(searchTerm)}`,
                {
                    headers: {
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                    },
                    credentials: "same-origin",
                },
            );

            if (!response.ok) throw new Error("Failed to load lockers");

            const data = await response.json();
            return { options: data.options, hasMore: data.hasMore };
        } catch (error) {
            console.error("Error loading available lockers:", error);
            toast.error("Failed to load available lockers");
            return { options: [], hasMore: false };
        }
    };

    const createForm = useForm({
        locker_no: "",
        employ_id: "",
        passcode: "",
        remarks: REMARK_ACTIVE,
    });

    const editForm = useForm({
        locker_no: "",
        employ_id: "",
        passcode: "",
        remarks: "",
    });

    const transferForm = useForm({ from_id: "", to_locker_no: "" });
    const uploadForm = useForm({ file: null });

    function openEdit(row) {
        setEditRow(row);
        editForm.setData({
            locker_no: row.locker_no,
            employ_id: row.employ_id ?? "",
            passcode: row.passcode ?? "",
            remarks: Number(row.remarks),
        });
    }

    function submitCreate(e) {
        e.preventDefault();
        createForm.post(route("lockers.store"), {
            onSuccess: () => {
                toast.success("Locker created successfully");
                createForm.reset();
                setShowCreate(false);
            },
            onError: (errors) => {
                toast.error("Failed to create locker");
            },
        });
    }

    function submitEdit(e) {
        e.preventDefault();
        editForm.put(route("lockers.update", editRow.id), {
            onSuccess: () => {
                toast.success("Locker updated successfully");
                setEditRow(null);
            },
            onError: (errors) => {
                toast.error("Failed to update locker");
            },
        });
    }

    function submitTransfer(e) {
        e.preventDefault();
        transferForm.post(route("lockers.transfer"), {
            onSuccess: () => {
                toast.success("Locker transferred successfully");
                setTransferRow(null);
                transferForm.reset();
            },
            onError: (errors) => {
                toast.error("Failed to transfer locker");
            },
        });
    }

    function submitUpload(e) {
        e.preventDefault();
        uploadForm.post(route("lockers.upload"), {
            forceFormData: true,
            onSuccess: () => {
                toast.success("File uploaded successfully");
                uploadForm.reset();
                setShowUpload(false);
            },
            onError: (errors) => {
                toast.error("Failed to upload file");
            },
        });
    }

    function handleDelete(id) {
        if (!confirm("Delete this locker record?")) return;
        router.delete(route("lockers.destroy", id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success("Locker deleted successfully");
            },
            onError: () => {
                toast.error("Failed to delete locker");
            },
        });
    }

    // ── render ───────────────────────────────────────────────────────────────
    return (
        <AuthenticatedLayout>
            <div className="p-6 max-w-7xl mx-auto">
                <h1 className="text-2xl font-bold mb-1">Locker Management</h1>
                <p className="text-muted-foreground text-sm mb-6">
                    Manage locker assignments, transfers, and bulk uploads.
                </p>

                {/* Toolbar */}
                <div className="flex flex-wrap gap-2 mb-4">
                    <Input
                        type="text"
                        placeholder="Search locker or employee..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                        className="w-60"
                    />
                    <Select
                        value={filterRemark !== "" ? String(filterRemark) : "all"}
                        onValueChange={(value) => {
                            const newValue = value === "all" ? "" : Number(value);
                            setFilterRemark(newValue);
                            applyFilters({ remarks: newValue || "" });
                        }}
                    >
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            {remarkOptions.map((r) => (
                                <SelectItem key={r.value} value={String(r.value)}>
                                    {r.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={() => applyFilters()}>
                        Search
                    </Button>

                    <div className="ml-auto flex gap-2">
                        <Button onClick={() => setShowCreate(true)}>
                            + Add Locker
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => setShowUpload(true)}
                        >
                            Upload Excel
                        </Button>
                        <Button variant="default" asChild>
                            <a href={route("lockers.export")}>Export Excel</a>
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Locker No</TableHead>
                                <TableHead>Employee ID</TableHead>
                                <TableHead>Employee Name</TableHead>
                                <TableHead>Passcode</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created By</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lockers.data.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="text-center text-muted-foreground"
                                    >
                                        No records found.
                                    </TableCell>
                                </TableRow>
                            )}
                            {lockers.data.map((row) => (
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
                                                remarkVariant[row.remarks] ||
                                                "secondary"
                                            }
                                        >
                                            {REMARK_LABELS[row.remarks] || row.remarks}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {row.created_by}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="link"
                                                size="sm"
                                                onClick={() => openEdit(row)}
                                                className="text-blue-600 h-auto p-0"
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                variant="link"
                                                size="sm"
                                                onClick={() => {
                                                    setTransferRow(row);
                                                    transferForm.setData(
                                                        "from_id",
                                                        row.id,
                                                    );
                                                }}
                                                className="text-indigo-600 h-auto p-0"
                                            >
                                                Transfer
                                            </Button>
                                            <Button
                                                variant="link"
                                                size="sm"
                                                onClick={() =>
                                                    handleDelete(row.id)
                                                }
                                                className="text-red-500 h-auto p-0"
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex gap-1 mt-4 justify-end">
                    {lockers.links.map((link, i) => (
                        <Button
                            key={i}
                            variant={link.active ? "default" : "outline"}
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
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ))}
                </div>

                {/* ── Modals ── */}

                {/* Create Dialog with Employee Combobox */}
                <Dialog open={showCreate} onOpenChange={setShowCreate}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Add Locker</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={submitCreate} className="space-y-4">
                            <div>
                                <Label htmlFor="locker_no">Locker No *</Label>
                                <Input
                                    id="locker_no"
                                    required
                                    value={createForm.data.locker_no}
                                    onChange={(e) =>
                                        createForm.setData(
                                            "locker_no",
                                            e.target.value,
                                        )
                                    }
                                />
                                {createForm.errors.locker_no && (
                                    <p className="text-sm text-red-500 mt-1">
                                        {createForm.errors.locker_no}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label>Employee (Optional)</Label>
                                <Combobox
                                    value={createForm.data.employ_id}
                                    onChange={(value) =>
                                        createForm.setData(
                                            "employ_id",
                                            value || "",
                                        )
                                    }
                                    placeholder="Select or search employee..."
                                    loadOptions={loadEmployees}
                                    allowCustomValue={false}
                                    clearable={true}
                                />
                                {createForm.errors.employ_id && (
                                    <p className="text-sm text-red-500 mt-1">
                                        {createForm.errors.employ_id}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="passcode">Passcode</Label>
                                <Input
                                    id="passcode"
                                    value={createForm.data.passcode}
                                    onChange={(e) =>
                                        createForm.setData(
                                            "passcode",
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>

                            <div>
                                <Label>Status</Label>
                                <Select
                                    value={String(createForm.data.remarks)}
                                    onValueChange={(v) =>
                                        createForm.setData("remarks", Number(v))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {remarkOptions.map((r) => (
                                            <SelectItem key={r.value} value={String(r.value)}>
                                                {r.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowCreate(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createForm.processing}
                                >
                                    {createForm.processing
                                        ? "Saving..."
                                        : "Save"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Edit Dialog with Employee Combobox */}
                <Dialog open={!!editRow} onOpenChange={() => setEditRow(null)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                Edit Locker {editRow?.locker_no}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={submitEdit} className="space-y-4">
                            <div>
                                <Label>Locker No</Label>
                                <Input
                                    value={editForm.data.locker_no}
                                    onChange={(e) =>
                                        editForm.setData(
                                            "locker_no",
                                            e.target.value,
                                        )
                                    }
                                />
                                {editForm.errors.locker_no && (
                                    <p className="text-sm text-red-500 mt-1">
                                        {editForm.errors.locker_no}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label>Employee (Optional)</Label>
                                <Combobox
                                    value={editForm.data.employ_id}
                                    onChange={(value) =>
                                        editForm.setData(
                                            "employ_id",
                                            value || "",
                                        )
                                    }
                                    placeholder="Select or search employee..."
                                    loadOptions={loadEmployees}
                                    allowCustomValue={false}
                                    clearable={true}
                                />
                                {editForm.errors.employ_id && (
                                    <p className="text-sm text-red-500 mt-1">
                                        {editForm.errors.employ_id}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label>Passcode</Label>
                                <Input
                                    value={editForm.data.passcode}
                                    onChange={(e) =>
                                        editForm.setData(
                                            "passcode",
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>

                            <div>
                                <Label>Status</Label>
                                <Select
                                    value={String(editForm.data.remarks)}
                                    onValueChange={(v) =>
                                        editForm.setData("remarks", Number(v))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {remarkOptions.map((r) => (
                                            <SelectItem key={r.value} value={String(r.value)}>
                                                {r.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setEditRow(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={editForm.processing}
                                >
                                    {editForm.processing
                                        ? "Saving..."
                                        : "Save Changes"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Transfer Dialog */}
                <Dialog
                    open={!!transferRow}
                    onOpenChange={() => { setTransferRow(null); transferForm.reset(); }}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                Transfer from Locker {transferRow?.locker_no}
                            </DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground">
                            Moving employee{" "}
                            <strong>{transferRow?.employ_id}</strong> to a
                            different locker.
                        </p>
                        <form onSubmit={submitTransfer} className="space-y-4">
                            <div>
                                <Label>Destination Locker No *</Label>
                                <Combobox
                                    value={transferForm.data.to_locker_no}
                                    onChange={(value) =>
                                        transferForm.setData(
                                            "to_locker_no",
                                            value || "",
                                        )
                                    }
                                    placeholder="Select vacant or inactive locker..."
                                    loadOptions={loadAvailableLockers}
                                    allowCustomValue={false}
                                    clearable={true}
                                />
                                {transferForm.errors.to_locker_no && (
                                    <p className="text-sm text-red-500 mt-1">
                                        {transferForm.errors.to_locker_no}
                                    </p>
                                )}
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setTransferRow(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={transferForm.processing}
                                >
                                    {transferForm.processing
                                        ? "Transferring..."
                                        : "Transfer"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Upload Dialog */}
                <Dialog open={showUpload} onOpenChange={setShowUpload}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Bulk Upload Excel</DialogTitle>
                        </DialogHeader>
                        <p className="text-xs text-muted-foreground">
                            Excel (.xlsx) must have columns:{" "}
                            <code className="text-xs">
                                Locker Number, Emp No, Passcode, Status, Remarks
                            </code>
                            <br />
                            Status accepts: <code className="text-xs">Active</code>,{" "}
                            <code className="text-xs">Vacant</code>,{" "}
                            <code className="text-xs">Inactive</code>
                        </p>
                        <form onSubmit={submitUpload} className="space-y-4">
                            <div>
                                <Label>Excel File *</Label>
                                <Input
                                    required
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={(e) =>
                                        uploadForm.setData(
                                            "file",
                                            e.target.files[0],
                                        )
                                    }
                                    className="text-sm"
                                />
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowUpload(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={uploadForm.processing}
                                >
                                    {uploadForm.processing
                                        ? "Uploading..."
                                        : "Upload"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AuthenticatedLayout>
    );
}
