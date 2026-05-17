<?php

namespace App\Repositories;

use App\Models\AdminLockerCode;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class AdminLockerCodeRepository
{
    public function __construct(protected AdminLockerCode $model) {}

    public function paginate(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        $query = $this->model->newQuery();

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('locker_no', 'like', "%{$search}%")
                    ->orWhere('employ_id', 'like', "%{$search}%");
            });
        }

        if (!empty($filters['remarks'])) {
            $query->where('remarks', $filters['remarks']);
        }

        $sortBy  = $filters['sort_by']  ?? 'locker_no';
        $sortDir = $filters['sort_dir'] ?? 'asc';
        $query->orderBy($sortBy, $sortDir);

        return $query->paginate($perPage)->withQueryString();
    }

    public function findById(int $id): ?AdminLockerCode
    {
        return $this->model->find($id);
    }

    public function findByLockerNo(string $lockerNo): ?AdminLockerCode
    {
        return $this->model->where('locker_no', $lockerNo)->first();
    }

    public function isEmployeeAssigned(string $employId, ?int $excludeId = null): bool
    {
        return $this->model
            ->where('employ_id', $employId)
            ->where('remarks', '!=', AdminLockerCode::REMARK_VACANT)
            ->when($excludeId, fn($q) => $q->where('id', '!=', $excludeId))
            ->exists();
    }

    public function vacantLockers(): Collection
    {
        return $this->model->vacant()->orderBy('locker_no')->get();
    }

    public function availableLockers(string $search = ''): Collection
    {
        $query = $this->model->newQuery()
            ->whereIn('remarks', [AdminLockerCode::REMARK_VACANT, AdminLockerCode::REMARK_INACTIVE])
            ->orderBy('locker_no');

        if ($search !== '') {
            $query->where('locker_no', 'like', "%{$search}%");
        }

        return $query->get();
    }

    public function exportAll(array $filters): Collection
    {
        $query = $this->model->newQuery();

        if (!empty($filters['remarks'])) {
            $query->where('remarks', $filters['remarks']);
        }

        return $query->orderBy('locker_no')->get();
    }

    public function create(array $data): AdminLockerCode
    {
        return $this->model->create($data);
    }

    public function update(int $id, array $data): AdminLockerCode
    {
        $record = $this->model->findOrFail($id);
        $record->update($data);
        return $record->fresh();
    }

    public function countByRemarks(): array
    {
        return $this->model->selectRaw('remarks, count(*) as total')
            ->groupBy('remarks')
            ->pluck('total', 'remarks')
            ->toArray();
    }

    public function delete(int $id): bool
    {
        return (bool) $this->model->findOrFail($id)->delete();
    }
}
