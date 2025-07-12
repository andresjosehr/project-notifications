<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\RegistrationToken;
use App\Models\ExternalCredential;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Tymon\JWTAuth\Facades\JWTAuth;

class UserController extends Controller
{
    public function checkInitialization()
    {
        try {
            $userCount = User::count();
            
            return response()->json([
                'success' => true,
                'isInitialized' => $userCount > 0,
                'userCount' => $userCount
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function registerAdmin(Request $request)
    {
        try {
            // Verificar que no hay usuarios registrados
            $userCount = User::count();
            if ($userCount > 0) {
                return response()->json([
                    'success' => false,
                    'error' => 'El sistema ya está inicializado. No se puede registrar un administrador adicional.'
                ], 403);
            }

            // Validar campos requeridos
            $validator = Validator::make($request->all(), [
                'email' => 'required|email|unique:users',
                'password' => 'required|min:6'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Email y contraseña son requeridos'
                ], 400);
            }

            // Leer contenido de los archivos desde la API de Node.js
            $professionalProfile = $this->readContentFile('profesional-profile.txt');
            $proposalDirectives = $this->readContentFile('proposal-directives.txt');

            // Crear usuario administrador
            $user = User::create([
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'telegram_user' => '',
                'role' => 'ADMIN',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Administrador registrado exitosamente. Ya puedes iniciar sesión.',
                'data' => [
                    'id' => $user->id,
                    'email' => $user->email,
                    'role' => $user->role
                ]
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    private function readContentFile($filename)
    {
        try {
            $filePath = base_path('../api/' . $filename);
            if (file_exists($filePath)) {
                return trim(file_get_contents($filePath));
            }
            return null;
        } catch (\Exception $e) {
            return null;
        }
    }

    public function login(Request $request)
    {
        try {
            // Validar campos requeridos
            $validator = Validator::make($request->all(), [
                'email' => 'required|email',
                'password' => 'required'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Email y contraseña son requeridos'
                ], 400);
            }

            // Buscar usuario por email y verificar que esté activo
            $user = User::where('email', $request->email)
                       ->where('is_active', true)
                       ->first();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'error' => 'Invalid credentials'
                ], 401);
            }

            // Verificar rol (permitir ADMIN y USER)
            if (!in_array($user->role, ['ADMIN', 'USER'])) {
                return response()->json([
                    'success' => false,
                    'error' => 'Access denied. Invalid user role.'
                ], 401);
            }

            // Verificar contraseña
            if (!Hash::check($request->password, $user->password)) {
                return response()->json([
                    'success' => false,
                    'error' => 'Invalid credentials'
                ], 401);
            }

            // Crear token JWT
            $token = JWTAuth::fromUser($user);

            return response()->json([
                'success' => true,
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'email' => $user->email,
                    'role' => $user->role
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function status(Request $request)
    {
        try {
            $data = [
                'app' => 'Laravel API v2.0',
                'status' => 'running',
                'timestamp' => now()->toISOString()
            ];

            // Si hay token de autenticación, incluir información del usuario
            try {
                $user = JWTAuth::parseToken()->authenticate();
                if ($user) {
                    $data['user'] = [
                        'id' => $user->id,
                        'email' => $user->email,
                        'role' => $user->role,
                        'isAuthenticated' => true
                    ];
                } else {
                    $data['user'] = ['isAuthenticated' => false];
                }
            } catch (\Exception $e) {
                $data['user'] = ['isAuthenticated' => false];
            }

            return response()->json([
                'success' => true,
                'data' => $data
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function registerWithToken(Request $request)
    {
        try {
            // Validar campos requeridos
            $validator = Validator::make($request->all(), [
                'token' => 'required|string',
                'email' => 'required|email|unique:users',
                'password' => 'required|min:6',
                'telegram_user' => 'string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Datos inválidos: ' . implode(', ', $validator->errors()->all())
                ], 400);
            }

            // Verificar que el token existe y es válido
            $registrationToken = RegistrationToken::where('token', $request->token)->first();
            
            if (!$registrationToken) {
                return response()->json([
                    'success' => false,
                    'error' => 'Token de registro inválido'
                ], 400);
            }

            if (!$registrationToken->isValid()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Token de registro ya utilizado'
                ], 400);
            }

            // Crear usuario
            $user = User::create([
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'telegram_user' => $request->telegram_user,
                'role' => 'USER',
                'is_active' => true
            ]);

            // Marcar token como usado
            $registrationToken->markAsUsed($user->id);

            // Crear token JWT para login automático
            $token = JWTAuth::fromUser($user);

            Log::info('Usuario registrado con token exitosamente', [
                'userId' => $user->id,
                'email' => $user->email,
                'registrationToken' => $request->token
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Usuario registrado exitosamente',
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'email' => $user->email,
                    'role' => $user->role,
                    'telegram_user' => $user->telegram_user
                ]
            ], 201);

        } catch (\Exception $e) {
            Log::error('Error en registro con token', ['error' => $e->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Token Management Methods

    public function getAllTokens(Request $request)
    {
        try {
            $page = $request->query('page', 1);
            $limit = $request->query('limit', 50);
            
            $tokens = RegistrationToken::with(['createdByAdmin', 'registeredUser'])
                ->orderBy('created_at', 'desc')
                ->paginate($limit, ['*'], 'page', $page);
            
            return response()->json([
                'success' => true,
                'data' => $tokens
            ]);
        } catch (\Exception $error) {
            Log::error('Error obteniendo tokens', ['error' => $error->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => $error->getMessage()
            ], 500);
        }
    }

    public function getTokenStats(Request $request)
    {
        try {
            $total = RegistrationToken::count();
            $unused = RegistrationToken::unused()->count();
            $used = RegistrationToken::used()->count();
            $createdThisWeek = RegistrationToken::where('created_at', '>=', now()->subWeek())->count();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'total' => $total,
                    'unused' => $unused,
                    'used' => $used,
                    'created_this_week' => $createdThisWeek
                ]
            ]);
        } catch (\Exception $error) {
            Log::error('Error obteniendo estadísticas de tokens', ['error' => $error->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => $error->getMessage()
            ], 500);
        }
    }

    public function generateToken(Request $request)
    {
        try {
            $user = Auth::user();
            
            $token = RegistrationToken::generateToken($user->id);
            
            return response()->json([
                'success' => true,
                'message' => 'Token de registro generado exitosamente',
                'data' => [
                    'id' => $token->id,
                    'token' => $token->token,
                    'isUsed' => $token->is_used,
                    'createdAt' => $token->created_at,
                    'createdByAdmin' => $token->created_by_admin,
                    'registerUrl' => url("/register.html?token={$token->token}")
                ]
            ]);
        } catch (\Exception $error) {
            Log::error('Error generando token de registro', ['error' => $error->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => $error->getMessage()
            ], 500);
        }
    }

    public function deleteToken(Request $request, $id)
    {
        try {
            $token = RegistrationToken::find($id);
            
            if (!$token) {
                return response()->json([
                    'success' => false,
                    'error' => 'Token no encontrado'
                ], 404);
            }
            
            $token->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Token eliminado exitosamente'
            ]);
        } catch (\Exception $error) {
            Log::error('Error eliminando token', ['error' => $error->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => $error->getMessage()
            ], 500);
        }
    }

    public function cleanupTokens(Request $request)
    {
        try {
            $days = $request->input('days', 30);
            
            $deletedCount = RegistrationToken::unused()
                ->where('created_at', '<', now()->subDays($days))
                ->delete();
            
            return response()->json([
                'success' => true,
                'message' => "{$deletedCount} tokens antiguos eliminados",
                'data' => ['deletedCount' => $deletedCount]
            ]);
        } catch (\Exception $error) {
            Log::error('Error limpiando tokens antiguos', ['error' => $error->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => $error->getMessage()
            ], 500);
        }
    }

    public function validateToken(Request $request, $token)
    {
        try {
            $registrationToken = RegistrationToken::where('token', $token)->first();
            $isValid = $registrationToken && $registrationToken->isValid();
            
            return response()->json([
                'success' => true,
                'data' => ['isValid' => $isValid]
            ]);
        } catch (\Exception $error) {
            Log::error('Error validando token', ['error' => $error->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => $error->getMessage()
            ], 500);
        }
    }

    // User Management Methods
    public function index(Request $request)
    {
        try {
            $users = User::with(['externalCredentials'])
                ->orderBy('created_at', 'desc')
                ->get();
            
            return response()->json([
                'success' => true,
                'data' => $users,
                'count' => $users->count()
            ]);
        } catch (\Exception $error) {
            Log::error('Error obteniendo todos los usuarios', ['error' => $error->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => $error->getMessage()
            ], 500);
        }
    }

    public function show(Request $request, User $user)
    {
        try {
            $user->load(['externalCredentials']);
            
            // Format user data for frontend compatibility
            $userData = $user->toArray();
            $userData['credentials'] = $user->externalCredentials->map(function($credential) {
                return [
                    'id' => $credential->id,
                    'platform' => $credential->platform,
                    'email' => $credential->email,
                    'isActive' => $credential->is_active
                ];
            });
            unset($userData['external_credentials']);
            
            return response()->json([
                'success' => true,
                'data' => $userData
            ]);
        } catch (\Exception $error) {
            Log::error('Error obteniendo usuario por ID', ['error' => $error->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => $error->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'email' => 'required|email|unique:users',
                'password' => 'required|min:6',
                'telegram_user' => 'required|string',
                'role' => 'in:USER,ADMIN'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Datos inválidos: ' . implode(', ', $validator->errors()->all())
                ], 400);
            }

            $user = User::create([
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'telegram_user' => $request->telegram_user,
                'role' => $request->role ?? 'USER',
                'is_active' => true
            ]);

            Log::info('Usuario creado exitosamente', [
                'userId' => $user->id,
                'email' => $user->email,
                'role' => $user->role
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Usuario creado exitosamente',
                'data' => $user
            ], 201);
        } catch (\Exception $error) {
            Log::error('Error creando usuario', ['error' => $error->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => $error->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, User $user)
    {
        try {
            $validator = Validator::make($request->all(), [
                'email' => 'sometimes|email|unique:users,email,' . $user->id,
                'password' => 'sometimes|min:6',
                'telegramUser' => 'sometimes|string',
                'role' => 'sometimes|in:USER,ADMIN',
                'workanaEmail' => 'sometimes|nullable|email',
                'workanaPassword' => 'sometimes|nullable|string',
                'proposalDirectives' => 'sometimes|string',
                'professionalProfile' => 'sometimes|string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Datos inválidos: ' . implode(', ', $validator->errors()->all())
                ], 400);
            }

            // Update user data
            $updateData = [];
            if ($request->has('email')) $updateData['email'] = $request->email;
            if ($request->has('telegramUser')) $updateData['telegram_user'] = $request->telegramUser;
            if ($request->has('role')) $updateData['role'] = $request->role;
            if ($request->has('proposalDirectives')) $updateData['proposal_directives'] = $request->proposalDirectives;
            if ($request->has('professionalProfile')) $updateData['professional_profile'] = $request->professionalProfile;
            
            if ($request->has('password')) {
                $updateData['password'] = Hash::make($request->password);
            }

            if (!empty($updateData)) {
                $user->update($updateData);
            }

            // Handle Workana credentials
            if ($request->has('workanaEmail') || $request->has('workanaPassword')) {
                $this->updateExternalCredentials($user, $request);
            }

            $user->load(['externalCredentials']);

            // Format user data for frontend compatibility
            $userData = $user->toArray();
            $userData['credentials'] = $user->externalCredentials->map(function($credential) {
                return [
                    'id' => $credential->id,
                    'platform' => $credential->platform,
                    'email' => $credential->email,
                    'isActive' => $credential->is_active
                ];
            });
            unset($userData['external_credentials']);

            Log::info('Usuario actualizado exitosamente', [
                'userId' => $user->id,
                'email' => $user->email
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Usuario actualizado exitosamente',
                'data' => $userData
            ]);
        } catch (\Exception $error) {
            Log::error('Error actualizando usuario', ['error' => $error->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => $error->getMessage()
            ], 500);
        }
    }

    private function updateExternalCredentials(User $user, Request $request)
    {
        $workanaCredential = ExternalCredential::where('user_id', $user->id)
            ->where('platform', 'workana')
            ->first();

        $credentialData = [
            'user_id' => $user->id,
            'platform' => 'workana',
            'is_active' => true
        ];

        if ($request->has('workanaEmail')) {
            $credentialData['email'] = $request->workanaEmail;
        }

        if ($request->has('workanaPassword') && !empty($request->workanaPassword)) {
            $credentialData['password'] = $request->workanaPassword;
        }

        if ($workanaCredential) {
            // Update existing credential
            $workanaCredential->update($credentialData);
        } else {
            // Create new credential
            ExternalCredential::create($credentialData);
        }
    }

    public function destroy(Request $request, User $user)
    {
        try {
            $email = $user->email;
            $user->delete();

            Log::info('Usuario eliminado exitosamente', [
                'userId' => $user->id,
                'email' => $email
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Usuario eliminado exitosamente'
            ]);
        } catch (\Exception $error) {
            Log::error('Error eliminando usuario', ['error' => $error->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => $error->getMessage()
            ], 500);
        }
    }

    public function stats(Request $request)
    {
        try {
            $totalUsers = User::count();
            $activeUsers = User::where('is_active', true)->count();
            
            // Count users with valid access tokens or recent sessions
            $usersWithValidSession = User::whereHas('accessTokens', function($query) {
                $query->valid();
            })->orWhereHas('sessions', function($query) {
                $query->where('last_activity', '>', now()->subHours(24)->timestamp);
            })->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'total' => $totalUsers,
                    'active' => $activeUsers,
                    'inactive' => $totalUsers - $activeUsers,
                    'withValidSession' => $usersWithValidSession
                ]
            ]);
        } catch (\Exception $error) {
            Log::error('Error obteniendo estadísticas de usuarios', ['error' => $error->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => $error->getMessage()
            ], 500);
        }
    }
}
