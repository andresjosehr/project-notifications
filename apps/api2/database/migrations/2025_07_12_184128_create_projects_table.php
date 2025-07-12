<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->longText('title')->nullable();
            $table->longText('description')->nullable();
            $table->longText('price')->nullable();
            $table->longText('skills')->nullable();
            $table->string('link', 255)->nullable();
            $table->enum('platform', ['workana', 'upwork']);
            $table->string('language', 10)->nullable();
            $table->string('client_name', 255)->nullable();
            $table->string('client_country', 100)->nullable();
            $table->decimal('client_rating', 3, 2)->nullable();
            $table->boolean('payment_verified')->default(false);
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_max_project')->default(false);
            $table->string('date', 50)->nullable();
            $table->string('time_ago', 50)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
