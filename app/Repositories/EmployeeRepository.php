<?php


namespace App\Repositories;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class EmployeeRepository
{
    /**
     * Get active employees with pagination and search
     */
    public function getActiveEmployeeList(array $params = []): array
    {
        try {
            $search = $params['search'] ?? '';
            $page = (int) ($params['page'] ?? 1);
            $perPage = (int) ($params['per_page'] ?? 50);

            $query = DB::connection('masterlist')
                ->table('employee_masterlist')
                ->where('ACCSTATUS', 1)
                ->where('EMPLOYID', '!=', '0')
                ->whereNotNull('EMPLOYID');

            // Search functionality
            if (!empty($search)) {
                $query->where(function ($q) use ($search) {
                    $q->where('EMPLOYID', 'LIKE', "%{$search}%")
                        ->orWhere('EMPNAME', 'LIKE', "%{$search}%");
                });
            }

            // Get total count
            $total = $query->count();

            // Get paginated results
            $employees = $query->select([
                'EMPLOYID as employid',
                'EMPNAME as emp_name',
            ])
                ->orderBy('EMPNAME')
                ->skip(($page - 1) * $perPage)
                ->take($perPage)
                ->get();

            // Format the data
            $data = array_map(function ($employee) {
                return [
                    'employid' => $employee->employid,
                    'emp_name' => $employee->emp_name,
                ];
            }, $employees->toArray());

            return [
                'data' => $data,
                'current_page' => $page,
                'last_page' => ceil($total / $perPage),
                'per_page' => $perPage,
                'total' => $total,
            ];
        } catch (\Exception $e) {
            Log::error("Failed to fetch active employees: " . $e->getMessage());
            return [
                'data' => [],
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => 50,
                'total' => 0,
            ];
        }
    }

    /**
     * Bulk fetch employee names keyed by EMPLOYID.
     * Returns ['EMP001' => 'Juan dela Cruz', ...]
     */
    public function getNamesByIds(array $employIds): array
    {
        if (empty($employIds)) return [];

        return DB::connection('masterlist')
            ->table('employee_masterlist')
            ->whereIn('EMPLOYID', $employIds)
            ->pluck('EMPNAME', 'EMPLOYID')
            ->toArray();
    }

    /**
     * Get initial employees for dropdown (first 50)
     */
    public function getInitialEmployees(): array
    {
        $result = $this->getActiveEmployeeList(['page' => 1, 'per_page' => 50]);

        return array_map(function ($employee) {
            return [
                'value' => $employee['employid'],
                'label' => $employee['employid'] . ' - ' . $employee['emp_name'],
                'employ_id' => $employee['employid'],
                'name' => $employee['emp_name'],
            ];
        }, $result['data']);
    }
}
