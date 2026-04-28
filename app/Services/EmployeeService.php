<?php


namespace App\Services;

use App\Repositories\EmployeeRepository;
use Illuminate\Http\Request;

class EmployeeService
{
    protected EmployeeRepository $employeeRepository;

    public function __construct(EmployeeRepository $employeeRepository)
    {
        $this->employeeRepository = $employeeRepository;
    }

    /**
     * Get active employees list with pagination
     */
    public function getActiveEmployeeList(array $params = []): array
    {
        return $this->employeeRepository->getActiveEmployeeList($params);
    }

    /**
     * Get initial employees for dropdown
     */
    public function getInitialEmployees(): array
    {
        return $this->employeeRepository->getInitialEmployees();
    }
}
