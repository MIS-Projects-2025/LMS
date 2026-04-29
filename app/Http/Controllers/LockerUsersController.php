<?php

namespace App\Http\Controllers;

use App\Services\LockerUsersService;
use Illuminate\Http\Request;

use Inertia\Inertia;

class LockerUsersController extends Controller
{
    protected LockerUsersService $lockerUsersService;

    public function __construct(LockerUsersService $lockerUsersService)
    {
        $this->lockerUsersService = $lockerUsersService;
    }
    public function index()
    {
        $lockerUserList = $this->lockerUsersService->requestorListTable();
        $lockerUserOptions = $this->lockerUsersService->getUserOptions();
        return Inertia::render('Admin/LockerUsers', [
            'lockerUserList' => $lockerUserList,
            'lockerUserOptions' => $lockerUserOptions
        ]);
    }
    public function store(Request $request)
    {
        // dd($request->all());
        $validated = $request->validate([
            'employid' => 'required|integer',
            'empname' => 'required|string|max:255',
            'department' => 'required|string|max:255',
            'prodline' => 'required|string|max:255',
            'station' => 'required|string|max:255',
        ]);

        try {
            $requestType = $this->lockerUsersService->create($validated);

            return response()->json([
                'success' => true,
                'message' => 'User created successfully',
                'id' => $requestType->id,
                'data' => $requestType
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create user: ' . $e->getMessage()
            ], 500);
        }
    }
    public function destroy($id)
    {
        try {
            $requestType = $this->lockerUsersService->findById($id);

            if (!$requestType) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found'
                ], 404);
            }

            $deleted = $this->lockerUsersService->delete($id);

            if ($deleted) {
                return response()->json([
                    'success' => true,
                    'message' => 'User deleted successfully'
                ], 200);
            }

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete user'
            ], 500);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete user: ' . $e->getMessage()
            ], 500);
        }
    }
}
