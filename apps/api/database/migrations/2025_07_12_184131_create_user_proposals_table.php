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
        Schema::create('user_proposals', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->integer('project_id');
            $table->enum('project_platform', ['workana', 'upwork'])->default('workana');
            $table->dateTime('proposal_sent_at')->useCurrent();
            $table->longText('proposal_content')->nullable();
            $table->enum('status', ['sent', 'accepted', 'rejected', 'pending'])->default('sent');
            $table->timestamps();
            
            $table->unique(['user_id', 'project_id', 'project_platform']);
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_proposals');
    }
};
