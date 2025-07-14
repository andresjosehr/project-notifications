<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AIService
{
    protected $apiKey;
    protected $apiUrl;
    protected $model;

    public function __construct()
    {
        $this->apiKey = env('GROP_API_KEY');
        $this->apiUrl = env('AI_API_URL', 'https://api.groq.com/openai/v1/chat/completions');
        $this->model = env('AI_MODEL', 'llama3-8b-8192');
    }

    public function buildProposal($projectDescription, $options = [])
    {
        try {
            $professionalProfile = $options['professional_profile'] ?? $this->getDefaultProfessionalProfile();
            $proposalDirectives = $options['proposal_directives'] ?? $this->getDefaultProposalDirectives();

            $prompt = $this->buildPrompt($projectDescription, $professionalProfile, $proposalDirectives);

            // Log removido - información innecesaria en producción
            
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post($this->apiUrl, [
                'model' => $this->model,
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'Eres un asistente especializado en crear propuestas profesionales para proyectos de freelance.'
                    ],
                    [
                        'role' => 'user',
                        'content' => $prompt
                    ]
                ],
                'max_tokens' => 1500,
                'temperature' => 0.7,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                return $data['choices'][0]['message']['content'] ?? 'Error generando propuesta';
            } else {
                Log::error('Error en API de IA', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                $context = [
                    'status' => $response->status(),
                    'response_body' => $response->body(),
                    'api_url' => $this->apiUrl,
                    'model' => $this->model,
                    'project_description_length' => strlen($projectDescription),
                    'professional_profile_length' => strlen($professionalProfile),
                    'proposal_directives_length' => strlen($proposalDirectives),
                    'timestamp' => now()->toISOString()
                ];
                throw new \Exception('Error comunicándose con el servicio de IA', 0, null, $context);
            }
        } catch (\Exception $e) {
            Log::error('Error generando propuesta con IA', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    protected function buildPrompt($projectDescription, $professionalProfile, $proposalDirectives)
    {
        return "
Descripción del proyecto:
{$projectDescription}

Mi perfil profesional:
{$professionalProfile}

Directivas para la propuesta:
{$proposalDirectives}

Por favor, genera una propuesta profesional y personalizada para este proyecto basada en mi perfil y las directivas proporcionadas.
";
    }

    protected function getDefaultProfessionalProfile()
    {
        return "Desarrollador Full Stack con experiencia en tecnologías web modernas, especializado en crear soluciones escalables y eficientes.";
    }

    protected function getDefaultProposalDirectives()
    {
        return "Crear una propuesta profesional, concisa y persuasiva que demuestre entendimiento del proyecto y capacidades técnicas relevantes.";
    }

    public function generateProposalWithUserProfile($projectTitle, $projectDescription, $userProfile, $userDirectives, $options = [])
    {
        try {
            if (!$userProfile) {
                throw new \Exception('Perfil profesional del usuario no proporcionado');
            }
            
            if (!$userDirectives) {
                throw new \Exception('Directrices de propuesta del usuario no proporcionadas');
            }

            $language = $options['language'] ?? 'es';
            $targetLanguage = $this->getTargetLanguage($language);

            $systemPrompt = "Eres un asistente especializado en redactar propuestas profesionales para proyectos freelance. 
Tu tarea es generar una propuesta personalizada basada en el perfil profesional y las directrices proporcionadas.
IMPORTANTE: La propuesta debe estar escrita completamente en {$targetLanguage}.";

            $userPrompt = "Basándote en el siguiente perfil profesional y las directrices de propuesta, redacta una propuesta personalizada para el proyecto en {$targetLanguage}.

PERFIL PROFESIONAL:
{$userProfile}

INFORMACIÓN DEL PROYECTO:
Título: {$projectTitle}
Descripción: {$projectDescription}

DIRECTRICES DE LA PROPUESTA:
{$userDirectives}

IMPORTANTE: La propuesta debe estar escrita completamente en {$targetLanguage}.";


            // Log removido - información innecesaria en producción
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post($this->apiUrl, [
                'model' => $this->model,
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => $systemPrompt
                    ],
                    [
                        'role' => 'user',
                        'content' => $userPrompt
                    ]
                ],
                'max_tokens' => 1500,
                'temperature' => 0.7,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $proposal = $data['choices'][0]['message']['content'] ?? 'Error generando propuesta';
                
                // Log removido - información innecesaria en producción

                return $proposal;
            } else {
                Log::error('Error en API de IA', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                $context = [
                    'status' => $response->status(),
                    'response_body' => $response->body(),
                    'api_url' => $this->apiUrl,
                    'model' => $this->model,
                    'project_title' => $projectTitle,
                    'project_description_length' => strlen($projectDescription),
                    'user_profile_length' => strlen($userProfile),
                    'user_directives_length' => strlen($userDirectives),
                    'language' => $language,
                    'target_language' => $targetLanguage,
                    'timestamp' => now()->toISOString()
                ];
                throw new \Exception('Error comunicándose con el servicio de IA', 0, null, $context);
            }
        } catch (\Exception $e) {
            Log::error('Error generando propuesta con perfil de usuario', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    protected function getTargetLanguage($languageCode)
    {
        $languageMap = [
            'es' => 'español',
            'en' => 'inglés',
            'pt' => 'portugués',
            'fr' => 'francés',
            'de' => 'alemán',
            'it' => 'italiano',
            'nl' => 'holandés',
            'ru' => 'ruso',
            'zh' => 'chino',
            'ja' => 'japonés',
            'ko' => 'coreano',
            'ar' => 'árabe',
            'hi' => 'hindi',
            'tr' => 'turco',
            'pl' => 'polaco',
            'sv' => 'sueco',
            'da' => 'danés',
            'no' => 'noruego',
            'fi' => 'finlandés',
            'cs' => 'checo',
            'sk' => 'eslovaco',
            'hu' => 'húngaro',
            'ro' => 'rumano',
            'bg' => 'búlgaro',
            'hr' => 'croata',
            'sl' => 'esloveno',
            'et' => 'estonio',
            'lv' => 'letón',
            'lt' => 'lituano',
            'mt' => 'maltés',
            'el' => 'griego',
            'cy' => 'galés',
            'ga' => 'irlandés',
            'is' => 'islandés',
            'fo' => 'feroés',
            'sq' => 'albanés',
            'mk' => 'macedonio',
            'sr' => 'serbio',
            'bs' => 'bosnio',
            'me' => 'montenegrino',
            'uk' => 'ucraniano',
            'be' => 'bielorruso',
        ];

        return $languageMap[$languageCode] ?? $languageCode;
    }
}