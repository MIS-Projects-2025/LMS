<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('locker_codes')) return;

        Schema::create('locker_codes', function (Blueprint $table) {
            $table->id();
            $table->string('locker_no', 100)->unique();
            $table->string('employ_id', 50)->nullable();
            $table->string('passcode', 50)->nullable();
            $table->unsignedTinyInteger('remarks')->default(1); // 1=Active, 2=Vacant, 3=Inactive
            $table->string('notes', 255)->nullable();
            $table->string('created_by', 100)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('locker_codes');
    }
};
