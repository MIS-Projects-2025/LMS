import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Badge } from "@/Components/ui/badge";
import { Button } from "@/Components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/Components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/Components/ui/table";

/**
 * History modal with server-side pagination and infinite scroll.
 * Loads 10 rows at a time; fetches more as the user scrolls to the bottom.
 *
 * Props:
 *   open              boolean
 *   onClose           () => void
 *   row               locker row object | null
 *   historyRouteName  route name string  e.g. 'lockers.history'
 */
export default function HistoryDialog({ open, onClose, row, historyRouteName }) {
    const [logs, setLogs]           = useState([]);
    const [loading, setLoading]     = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore]     = useState(false);
    const [total, setTotal]         = useState(0);
    const pageRef                   = useRef(1);
    const scrollRef                 = useRef(null);   // scrollable container
    const sentinelRef               = useRef(null);   // bottom sentinel for IntersectionObserver

    // ── fetch a single page ───────────────────────────────────────────────────
    const fetchPage = useCallback(async (pageNum, append = false) => {
        if (!row) return;

        append ? setLoadingMore(true) : setLoading(true);

        try {
            const url = `${route(historyRouteName, row.id)}?page=${pageNum}`;
            const res = await fetch(url, {
                headers: {
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
                credentials: "same-origin",
            });
            if (!res.ok) throw new Error();
            const data = await res.json();

            setLogs((prev) => append ? [...prev, ...data.data] : data.data);
            setHasMore(data.has_more);
            setTotal(data.total);
            pageRef.current = pageNum;
        } catch {
            toast.error("Failed to load locker history");
        } finally {
            append ? setLoadingMore(false) : setLoading(false);
        }
    }, [row, historyRouteName]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── reset + load page 1 whenever the dialog opens ────────────────────────
    useEffect(() => {
        if (!open || !row) return;
        setLogs([]);
        setHasMore(false);
        setTotal(0);
        pageRef.current = 1;
        fetchPage(1, false);
    }, [open, row]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── IntersectionObserver on sentinel to trigger next page load ────────────
    useEffect(() => {
        const sentinel = sentinelRef.current;
        const container = scrollRef.current;
        if (!sentinel || !container) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore) {
                    fetchPage(pageRef.current + 1, true);
                }
            },
            { root: container, threshold: 0.1 },
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, loadingMore, fetchPage]);

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        History — Locker {row?.locker_no}
                        {total > 0 && (
                            <span className="ml-2 text-sm font-normal text-muted-foreground">
                                ({total} record{total !== 1 ? "s" : ""})
                            </span>
                        )}
                    </DialogTitle>
                </DialogHeader>

                {/* Scrollable table area */}
                <div
                    ref={scrollRef}
                    className="max-h-96 overflow-y-auto rounded border"
                >
                    {loading ? (
                        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                            Loading…
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                            No history found.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="sticky top-0 bg-background z-10">
                                <TableRow>
                                    <TableHead>Action</TableHead>
                                    <TableHead>By</TableHead>
                                    <TableHead className="whitespace-nowrap">Date / Time</TableHead>
                                    <TableHead>Changed Fields</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    log.action_type === "CREATED"
                                                        ? "default"
                                                        : log.action_type === "DELETED"
                                                        ? "destructive"
                                                        : "secondary"
                                                }
                                            >
                                                {log.action_type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {log.action_by ?? "—"}
                                        </TableCell>
                                        <TableCell className="text-sm whitespace-nowrap">
                                            {log.action_at
                                                ? new Date(log.action_at).toLocaleString()
                                                : "—"}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground max-w-xs">
                                            {log.action_type === "UPDATED" && log.old_values ? (
                                                <ul className="space-y-0.5">
                                                    {Object.keys(log.new_values ?? {}).map((key) => (
                                                        <li key={key}>
                                                            <span className="font-medium">{key}:</span>{" "}
                                                            <span className="line-through text-destructive">
                                                                {String(log.old_values[key] ?? "")}
                                                            </span>{" "}
                                                            → {String(log.new_values[key] ?? "")}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                "—"
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {/* Sentinel row — triggers next page load */}
                                <TableRow ref={sentinelRef} className="border-0">
                                    <TableCell colSpan={4} className="py-2 text-center">
                                        {loadingMore && (
                                            <span className="text-xs text-muted-foreground">
                                                Loading more…
                                            </span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
