<?php

namespace App\Services;

use App\Repositories\LockerUsersRepository;

class LockerUsersService
{
    protected LockerUsersRepository $lockerUsersRepository;

    public function __construct(LockerUsersRepository $lockerUsersRepository)
    {
        $this->lockerUsersRepository = $lockerUsersRepository;
    }
    public function requestorListTable()
    {
        return $this->lockerUsersRepository->requestorListTable();
    }
    public function getUserOptions()
    {
        return $this->lockerUsersRepository->getUserOptions();
    }
    public function create(array $data)
    {
        return $this->lockerUsersRepository->create($data);
    }
    public function findById(int $id)
    {
        return $this->lockerUsersRepository->findById($id);
    }
    public function delete(int $id): bool
    {
        return $this->lockerUsersRepository->delete($id);
    }
}
