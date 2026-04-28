<?php

namespace App\Http\Controllers;

use App\Services\EmployeeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeSearchController extends Controller
{
    public function __construct(protected EmployeeService $service) {}

    public function search(Request $request): JsonResponse
    {
        $result = $this->service->getActiveEmployeeList([
            'search'   => $request->input('search') ?? '',
            'page'     => (int) $request->input('page', 1),
            'per_page' => 50,
        ]);

        $options = array_map(fn($e) => [
            'value' => $e['employid'],
            'label' => $e['employid'] . ' - ' . $e['emp_name'],
        ], $result['data']);

        return response()->json([
            'options' => $options,
            'hasMore' => $result['current_page'] < $result['last_page'],
        ]);
    }
}
