<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('locker_logs')) return;

        Schema::create('locker_logs', function (Blueprint $table) {
            $table->id();
            $table->string('loggable_type', 100)->nullable();
            $table->string('loggable_id', 100)->nullable();
            $table->string('action_type', 50)->nullable();
            $table->string('action_by', 100)->nullable();
            $table->dateTime('action_at')->nullable();
            $table->string('remarks', 255)->nullable();
            $table->json('metadata')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('related_type', 100)->nullable();
            $table->string('related_id', 100)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('locker_logs');
    }
};
