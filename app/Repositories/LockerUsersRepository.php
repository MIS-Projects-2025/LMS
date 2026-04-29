<?php

namespace App\Repositories;

use App\Models\LockerUsers;
use App\Models\User;
use Illuminate\Support\Collection;

class LockerUsersRepository
{
    public function __construct(protected LockerUsers $model) {}

    public function requestorListTable(): Collection
    {
        return $this->model
            ->select('id', 'employid', 'empname', 'department', 'prodline', 'station', 'created_at', 'updated_at')
            ->orderBy('id')
            ->get();
    }

    public function getUserOptions(): Collection
    {
        return User::getUserOptions();
    }

    public function create(array $data): LockerUsers
    {
        return $this->model->create([
            'employid'   => $data['employid'],
            'empname'    => $data['empname'],
            'department' => $data['department'],
            'prodline'   => $data['prodline'],
            'station'    => $data['station'],
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function findById(int $id): ?LockerUsers
    {
        return $this->model->find($id);
    }

    public function update(int $id, array $data): LockerUsers
    {
        $record = $this->model->findOrFail($id);
        $record->update($data);
        return $record->fresh();
    }

    public function delete(int $id): bool
    {
        return (bool) $this->model->findOrFail($id)->delete();
    }
}