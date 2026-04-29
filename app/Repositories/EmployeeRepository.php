<?php

namespace App\Repositories;

use App\Models\Masterlist;
use Illuminate\Support\Facades\Log;

class EmployeeRepository
{
    /**
     * Get active employees with pagination and search.
     */
    public function getActiveEmployeeList(array $params = []): array
    {
        try {
            $search  = $params['search']   ?? '';
            $page    = (int) ($params['page']     ?? 1);
            $perPage = (int) ($params['per_page'] ?? 50);

            $query = Masterlist::where('ACCSTATUS', 1)
                ->where('EMPLOYID', '!=', '0')
                ->whereNotNull('EMPLOYID');

            if (!empty($search)) {
                $query->where(function ($q) use ($search) {
                    $q->where('EMPLOYID', 'LIKE', "%{$search}%")
                      ->orWhere('EMPNAME',  'LIKE', "%{$search}%");
                });
            }

            $total = $query->count();

            $employees = $query->select('EMPLOYID', 'EMPNAME')
                ->orderBy('EMPNAME')
                ->skip(($page - 1) * $perPage)
                ->take($perPage)
                ->get();

            $data = $employees->map(fn($e) => [
                'employid' => $e->EMPLOYID,
                'emp_name' => $e->EMPNAME,
            ])->all();

            return [
                'data'         => $data,
                'current_page' => $page,
                'last_page'    => (int) ceil($total / $perPage),
                'per_page'     => $perPage,
                'total'        => $total,
            ];
        } catch (\Exception $e) {
            Log::error('Failed to fetch active employees: ' . $e->getMessage());
            return ['data' => [], 'current_page' => 1, 'last_page' => 1, 'per_page' => 50, 'total' => 0];
        }
    }

    /**
     * Bulk-fetch employee names keyed by EMPLOYID.
     * Returns ['EMP001' => 'Juan dela Cruz', ...]
     */
    public function getNamesByIds(array $employIds): array
    {
        if (empty($employIds)) return [];

        return Masterlist::whereIn('EMPLOYID', $employIds)
            ->pluck('EMPNAME', 'EMPLOYID')
            ->toArray();
    }

    /**
     * Bulk-fetch ACCSTATUS keyed by EMPLOYID — use this to avoid N+1 during uploads.
     * Returns ['EMP001' => 1, 'EMP002' => 2, ...]
     */
    public function getAccStatusByIds(array $employIds): array
    {
        if (empty($employIds)) return [];

        return Masterlist::whereIn('EMPLOYID', $employIds)
            ->pluck('ACCSTATUS', 'EMPLOYID')
            ->map(fn($v) => (int) $v)
            ->toArray();
    }

    /**
     * Single-record convenience wrapper around getAccStatusByIds.
     */
    public function getAccStatusById(string $employId): ?int
    {
        return $this->getAccStatusByIds([$employId])[$employId] ?? null;
    }

    /**
     * Get initial employees for dropdown (first 50).
     */
    public function getInitialEmployees(): array
    {
        $result = $this->getActiveEmployeeList(['page' => 1, 'per_page' => 50]);

        return array_map(fn($e) => [
            'value'     => $e['employid'],
            'label'     => $e['employid'] . ' - ' . $e['emp_name'],
            'employ_id' => $e['employid'],
            'name'      => $e['emp_name'],
        ], $result['data']);
    }
}
