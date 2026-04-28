<?php

namespace App\Services;

use App\Models\LockerCode;
use App\Repositories\EmployeeRepository;
use App\Repositories\LockerCodeRepository;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
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

        $data['remarks']    ??= LockerCode::REMARK_ACTIVE;
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
            'remarks'   => LockerCode::REMARK_ACTIVE,
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
     * Bulk upload rows from a CSV.
     * Returns ['created' => Collection, 'errors' => array]
     */
    public function upload(array $rows): array
    {
        $toInsert = [];
        $errors   = [];
        $seen     = [];

        foreach ($rows as $index => $row) {
            $rowNum    = $index + 1;
            $lockerNo  = trim($row['locker_number'] ?? '');
            $employId  = trim($row['emp_no'] ?? '');
            $statusTxt = strtolower(trim($row['status'] ?? ''));
            $status    = LockerCode::STATUS_MAP[$statusTxt] ?? LockerCode::REMARK_ACTIVE;

            if (empty($lockerNo)) {
                $errors[] = "Row {$rowNum}: Locker Number is required.";
                continue;
            }

            if ($employId && in_array($employId, $seen)) {
                $errors[] = "Row {$rowNum}: Employee No {$employId} is duplicated in the file.";
                continue;
            }

            if ($employId && $this->repo->isEmployeeAssigned($employId)) {
                $errors[] = "Row {$rowNum}: Employee No {$employId} is already assigned to a locker.";
                continue;
            }

            $locker = $this->repo->findByLockerNo($lockerNo);

            if ($locker && !$locker->isVacant()) {
                $statusLabel = LockerCode::REMARK_LABELS[$locker->remarks] ?? $locker->remarks;
                $errors[] = "Row {$rowNum}: Locker {$lockerNo} is not vacant (status: {$statusLabel}).";
                continue;
            }

            $seen[] = $employId;

            $toInsert[] = [
                'locker_no'  => $lockerNo,
                'employ_id'  => $employId ?: null,
                'passcode'   => trim($row['passcode'] ?? ''),
                'remarks'    => $status,
                'notes'      => trim($row['remarks'] ?? ''),
                'created_by' => $this->currentUser(),
            ];
        }

        $created = $this->repo->bulkCreate($toInsert);

        return ['created' => $created, 'errors' => $errors];
    }

    public function export(array $filters = []): Collection
    {
        return $this->repo->exportAll($filters);
    }

    public function vacantLockers(): Collection
    {
        return $this->repo->vacantLockers();
    }

    public function availableLockers(string $search = ''): Collection
    {
        return $this->repo->availableLockers($search);
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
        return (string) (Auth::user()?->name ?? Auth::id() ?? 'system');
    }
}
