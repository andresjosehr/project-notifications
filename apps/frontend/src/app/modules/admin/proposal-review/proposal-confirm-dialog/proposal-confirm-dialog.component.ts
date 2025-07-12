import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Project, User } from 'app/core/services/api.service';

export interface ProposalConfirmDialogData {
    project: Project;
    user: User;
    proposalContent: string;
    charCount: number;
    wordCount: number;
}

@Component({
    selector: 'app-proposal-confirm-dialog',
    template: `
        <div class="proposal-confirm-dialog">
            <div class="dialog-header">
                <h2 mat-dialog-title>Confirmar Envío de Propuesta</h2>
                <button 
                    mat-icon-button 
                    mat-dialog-close
                    class="close-button">
                    <mat-icon>close</mat-icon>
                </button>
            </div>
            
            <mat-dialog-content class="dialog-content">
                <p class="confirm-message">
                    ¿Estás seguro de que quieres enviar esta propuesta para el proyecto 
                    <strong>"{{ data.project?.title || 'Sin título' }}"</strong>?
                </p>
                
                <div class="proposal-preview">
                    <h3>Vista previa de la propuesta:</h3>
                    <div class="proposal-text">
                        {{ getProposalPreview() }}
                    </div>
                    
                    <div class="proposal-meta">
                        <div class="meta-item">
                            <mat-icon>person</mat-icon>
                            <span>Usuario: {{ data.user?.email || 'Desconocido' }}</span>
                        </div>
                        <div class="meta-item">
                            <mat-icon>analytics</mat-icon>
                            <span>{{ data.charCount }} caracteres, {{ data.wordCount }} palabras</span>
                        </div>
                    </div>
                </div>
            </mat-dialog-content>
            
            <mat-dialog-actions class="dialog-actions">
                <button 
                    mat-button 
                    mat-dialog-close
                    color="warn">
                    <mat-icon>cancel</mat-icon>
                    Cancelar
                </button>
                <button 
                    mat-raised-button 
                    [mat-dialog-close]="true"
                    color="primary">
                    <mat-icon>send</mat-icon>
                    Confirmar y Enviar
                </button>
            </mat-dialog-actions>
        </div>
    `,
    styles: [`
        .proposal-confirm-dialog {
            .dialog-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
                
                h2 {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 600;
                }
                
                .close-button {
                    margin-left: auto;
                }
            }
            
            .dialog-content {
                .confirm-message {
                    font-size: 1rem;
                    margin-bottom: 1.5rem;
                    color: #374151;
                    
                    strong {
                        color: #111827;
                    }
                }
                
                .proposal-preview {
                    h3 {
                        font-size: 0.875rem;
                        font-weight: 600;
                        color: #374151;
                        margin-bottom: 0.75rem;
                    }
                    
                    .proposal-text {
                        background: #f9fafb;
                        border: 1px solid #e5e7eb;
                        border-radius: 6px;
                        padding: 1rem;
                        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                        font-size: 0.75rem;
                        line-height: 1.5;
                        color: #374151;
                        max-height: 200px;
                        overflow-y: auto;
                        white-space: pre-wrap;
                        margin-bottom: 1rem;
                    }
                    
                    .proposal-meta {
                        display: flex;
                        flex-direction: column;
                        gap: 0.5rem;
                        
                        .meta-item {
                            display: flex;
                            align-items: center;
                            gap: 0.5rem;
                            font-size: 0.75rem;
                            color: #6b7280;
                            
                            mat-icon {
                                font-size: 1rem;
                                width: 1rem;
                                height: 1rem;
                            }
                        }
                    }
                }
            }
            
            .dialog-actions {
                display: flex;
                justify-content: flex-end;
                gap: 0.75rem;
                margin-top: 1.5rem;
                padding-top: 1rem;
                border-top: 1px solid #e5e7eb;
            }
        }
        
        @media (max-width: 600px) {
            .proposal-confirm-dialog {
                .dialog-actions {
                    flex-direction: column-reverse;
                    
                    button {
                        width: 100%;
                    }
                }
            }
        }
    `],
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
    ]
})
export class ProposalConfirmDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<ProposalConfirmDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: ProposalConfirmDialogData
    ) {}

    getProposalPreview(): string {
        const content = this.data.proposalContent;
        if (content.length <= 200) {
            return content;
        }
        return content.substring(0, 200) + '...';
    }
}