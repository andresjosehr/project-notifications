<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ExternalCredentialController;
use App\Http\Controllers\ScraperController;
use App\Http\Controllers\ProposalController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Health and status
Route::get('/health', [ProjectController::class, 'healthCheck']);
Route::get('/status', [UserController::class, 'status']);

// Stats endpoint (moved out of projects prefix)
Route::get('/stats', [ProjectController::class, 'getStats']);

// Auth routes
Route::prefix('auth')->group(function () {
    Route::get('/check-initialization', [UserController::class, 'checkInitialization']);
    Route::post('/register-admin', [UserController::class, 'registerAdmin']);
    Route::post('/register-with-token', [UserController::class, 'registerWithToken']);
    Route::post('/login', [UserController::class, 'login']);
});

// Project routes
Route::prefix('projects')->middleware(['auth.api'])->group(function () {
    Route::get('/recent', [ProjectController::class, 'getRecent']);
    Route::get('/search', [ProjectController::class, 'search']);
    Route::get('/{id}', [ProjectController::class, 'show']);
    Route::post('/cleanup', [ProjectController::class, 'cleanup']);
});

// Scraping routes
Route::prefix('scrape')->group(function () {
    Route::post('/single', [ProjectController::class, 'runScrapingCycle']);
    Route::post('/{platform}', [ProjectController::class, 'runSinglePlatform']);
});

// AI and proposal routes
Route::post('/proposal/generate', [ProjectController::class, 'buildProposal'])->middleware(['auth.api']);

// Send proposal endpoint
Route::post('/proposal/send', [ProposalController::class, 'send'])->middleware(['auth.api']);

// Workana specific routes (communication with Node.js)
Route::prefix('workana')->group(function () {
    Route::post('/scrape', [ScraperController::class, 'scrapeWorkana']);
    Route::post('/login', function () {
        return app(ScraperController::class)->workanaLogin(request());
    });
    Route::post('/proposal', function () {
        return app(ScraperController::class)->workanaProposal(request());
    });
});

// Upwork specific routes
Route::prefix('upwork')->group(function () {
    Route::post('/scrape', function () {
        return app(ScraperController::class)->scrapeUpwork(request());
    });
});

// User management routes (protected)
Route::prefix('users')->middleware(['auth.api'])->group(function () {
    Route::get('/', [UserController::class, 'index'])->middleware('admin');
    Route::get('/stats', [UserController::class, 'stats'])->middleware('admin');
    Route::post('/', [UserController::class, 'store'])->middleware('admin');
    Route::get('/{user}', [UserController::class, 'show']);
    Route::put('/{user}', [UserController::class, 'update']);
    Route::delete('/{user}', [UserController::class, 'destroy'])->middleware('admin');
});

// External credentials routes (protected)
Route::prefix('credentials')->middleware(['auth.api'])->group(function () {
    Route::get('/user/{user}', [ExternalCredentialController::class, 'getByUser']);
    Route::post('/', [ExternalCredentialController::class, 'store']);
    Route::put('/{credential}', [ExternalCredentialController::class, 'update']);
    Route::delete('/{credential}', [ExternalCredentialController::class, 'destroy']);
});

// Logs routes
Route::prefix('logs')->group(function () {
    Route::get('/app', [ProjectController::class, 'getAppLogs']);
    Route::get('/error', [ProjectController::class, 'getErrorLogs']);
    Route::post('/clear', [ProjectController::class, 'clearLogs']);
});

// Token management routes
Route::prefix('tokens')->group(function () {
    // Public routes
    Route::get('/validate/{token}', [UserController::class, 'validateToken']);
    
    // Admin protected routes
    Route::middleware(['auth.api', 'admin'])->group(function () {
        Route::get('/', [UserController::class, 'getAllTokens']);
        Route::get('/stats', [UserController::class, 'getTokenStats']);
        Route::post('/generate', [UserController::class, 'generateToken']);
        Route::delete('/{id}', [UserController::class, 'deleteToken']);
        Route::post('/cleanup', [UserController::class, 'cleanupTokens']);
    });
});

// Rutas de scraping
Route::prefix('scraper')->group(function () {
    Route::post('/workana', [ScraperController::class, 'scrapeWorkana']);
    Route::post('/command', [ScraperController::class, 'executeScrapingCommand']);
    Route::get('/health', [ScraperController::class, 'healthCheck']);
    Route::get('/stats', [ScraperController::class, 'getStats']);
});