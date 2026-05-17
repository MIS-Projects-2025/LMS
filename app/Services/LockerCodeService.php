<?php

namespace App\Services;

use App\Models\LockerCode;
use App\Models\LockerLogs;
use App\Repositories\EmployeeRepository;
use App\Repositories\LockerCodeRepository;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class LockerCodeService
{
    public function __construct(
        protected LockerCodeRepository $repo,
        protected EmployeeRepository   $employees,
    ) {}

    public function list(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        $paginator = $this->repo->paginate($filters, $perPage);

        $ids   = collect($paginator->items())->pluck('employ_id')->filter()->unique()->values()->all();
        $names = $this->employees->getNamesByIds($ids);

        $paginator->getCollection()->transform(function ($locker) use ($names) {
            $locker->employee_name = $names[$locker->employ_id] ?? null;
            return $locker;
        });

        return $paginator;
    }

    public function create(array $data): LockerCode
    {
        $this->ensureLockerNotTaken($data['locker_no']);
        $this->ensureEmployeeNotAssigned($data['employ_id'] ?? null);

        $data['remarks']    = $this->computeRemarks($data['employ_id'] ?? null);
        $data['created_by'] ??= $this->currentUser();

        return $this->repo->create($data);
    }

    public function edit(int $id, array $data): LockerCode
    {
        $record = $this->repo->findById($id);

        if (!$record) {
            throw ValidationException::withMessages(['id' => 'Locker record not found.']);
        }

        if (isset($data['locker_no']) && $data['locker_no'] !== $record->locker_no) {
            $this->ensureLockerNotTaken($data['locker_no']);
        }

        if (isset($data['employ_id']) && $data['employ_id'] !== $record->employ_id && !empty($data['employ_id'])) {
            $this->ensureEmployeeNotAssigned($data['employ_id'], $id);
        }

        // Auto-compute remarks from the resulting employ_id
        $employId        = array_key_exists('employ_id', $data) ? $data['employ_id'] : $record->employ_id;
        $data['remarks'] = $this->computeRemarks($employId);

        return $this->repo->update($id, $data);
    }

    public function transfer(int $fromId, string $toLockerNo): array
    {
        $from = $this->repo->findById($fromId);

        if (!$from) {
            throw ValidationException::withMessages(['from_id' => 'Source locker not found.']);
        }

        $to = $this->repo->findByLockerNo($toLockerNo);

        if (!$to) {
            throw ValidationException::withMessages(['to_locker_no' => 'Destination locker not found.']);
        }

        if (!$to->isVacant() && !$to->isInactive()) {
            throw ValidationException::withMessages(['to_locker_no' => 'Destination locker must be vacant or inactive.']);
        }

        $updated = $this->repo->update($to->id, [
            'employ_id' => $from->employ_id,
            'passcode'  => $from->passcode,
            'remarks'   => $this->computeRemarks($from->employ_id),
        ]);

        $this->repo->update($from->id, [
            'employ_id' => null,
            'passcode'  => null,
            'remarks'   => LockerCode::REMARK_VACANT,
        ]);

        return ['from' => $from->fresh(), 'to' => $updated];
    }

    public function delete(int $id): bool
    {
        return $this->repo->delete($id);
    }

    /**
     * Bulk upload rows from an Excel file.
     * Returns ['counts' => [...], 'errors' => [...]]
     */
    public function upload(array $rows): array
    {
        $errors = [];
        $seen   = [];
        $counts = ['created' => 0, 'updated' => 0];

        // Pre-fetch ACCSTATUS for all non-special employee IDs in one query (avoids N+1)
        $idsToLookup = collect($rows)
            ->pluck('emp_no')
            ->map(fn($id) => trim((string) $id))
            ->filter(fn($id) => !empty($id) && strtolower($id) !== 'others')
            ->unique()
            ->values()
            ->all();

        $accStatusMap = $this->employees->getAccStatusByIds($idsToLookup);

        foreach ($rows as $index => $row) {
            $rowNum   = $index + 1;
            $lockerNo = trim($row['locker_number'] ?? '');
            $employId = trim($row['emp_no'] ?? '');

            if (empty($lockerNo)) {
                $errors[] = "Row {$rowNum}: Locker Number is required.";
                continue;
            }

            $isOthers = strtolower($employId) === 'others';

            // Duplicate employee within the uploaded file (skip for "others")
            if ($employId && !$isOthers && in_array($employId, $seen)) {
                $errors[] = "Row {$rowNum}: Employee No {$employId} is duplicated in the file.";
                continue;
            }

            // Employee already has a locker anywhere in the DB — block unconditionally (skip for "others")
            if ($employId && !$isOthers && $this->repo->isEmployeeAssigned($employId)) {
                $errors[] = "Row {$rowNum}: Employee No {$employId}: Locker for this employee already exists. Please check and modify the current locker first.";
                continue;
            }

            if ($employId && !$isOthers) {
                $seen[] = $employId;
            }

            $existing = $this->repo->findByLockerNo($lockerNo);

            $data = [
                'employ_id'  => $employId ?: null,
                'passcode'   => trim($row['passcode'] ?? ''),
                'remarks'    => $this->computeRemarks($employId ?: null, $accStatusMap),
                'notes'      => trim($row['notes'] ?? ''),
                'created_by' => $this->currentUser(),
            ];

            if ($existing) {
                $this->repo->update($existing->id, $data);
                $counts['updated']++;
            } else {
                $this->repo->create(array_merge($data, ['locker_no' => $lockerNo]));
                $counts['created']++;
            }
        }

        return ['counts' => $counts, 'errors' => $errors];
    }

    public function export(array $filters = []): Collection
    {
        return $this->repo->exportAll($filters);
    }

    public function countByRemarks(): array
    {
        return $this->repo->countByRemarks();
    }

    public function vacantLockers(): Collection
    {
        return $this->repo->vacantLockers();
    }

    public function availableLockers(string $search = ''): Collection
    {
        return $this->repo->availableLockers($search);
    }

    public function history(int $id, int $page = 1, int $perPage = 10): array
    {
        $record = $this->repo->findById($id);

        if (!$record) {
            return ['data' => [], 'has_more' => false, 'total' => 0];
        }

        $paginator = LockerLogs::where('loggable_type', LockerCode::class)
            ->where('loggable_id', $record->id)
            ->orderByDesc('action_at')
            ->paginate($perPage, ['*'], 'page', $page);

        return [
            'data'     => $paginator->items(),
            'has_more' => $paginator->hasMorePages(),
            'total'    => $paginator->total(),
        ];
    }

    // ── private helpers ───────────────────────────────────────────────────────

    /**
     * Automatically determine the remarks integer based on employ_id and masterlist ACCSTATUS.
     *
     * Pass a pre-fetched $accStatusMap (from getAccStatusByIds) to avoid a DB hit per call.
     *
     * Rules:
     *   - blank/null      → Vacant (2)
     *   - "Others"        → Temporary (4)
     *   - ACCSTATUS = 2   → Inactive (3)
     *   - ACCSTATUS = 1   → Active (1)  [default]
     */
    private function computeRemarks(?string $employId, array $accStatusMap = []): int
    {
        if (empty($employId)) {
            return LockerCode::REMARK_VACANT;
        }

        if (strtolower(trim($employId)) === 'others') {
            return LockerCode::REMARK_TEMPORARY;
        }

        $accStatus = array_key_exists($employId, $accStatusMap)
            ? $accStatusMap[$employId]
            : $this->employees->getAccStatusById($employId);

        return $accStatus === 2 ? LockerCode::REMARK_INACTIVE : LockerCode::REMARK_ACTIVE;
    }

    private function ensureLockerNotTaken(string $lockerNo): void
    {
        if ($this->repo->findByLockerNo($lockerNo)) {
            throw ValidationException::withMessages([
                'locker_no' => "Locker number {$lockerNo} is already in use.",
            ]);
        }
    }

    private function ensureEmployeeNotAssigned(?string $employId, ?int $excludeId = null): void
    {
        if (empty($employId)) return;

        if ($this->repo->isEmployeeAssigned($employId, $excludeId)) {
            throw ValidationException::withMessages([
                'employ_id' => "Employee {$employId} is already assigned to a locker.",
            ]);
        }
    }

    private function currentUser(): string
    {
        $empData = session('emp_data');
        return (string) ($empData['emp_id'] ?? $empData['emp_name'] ?? 'system');
    }
}
