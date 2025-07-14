import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { FuseCardComponent } from '@fuse/components/card';

export interface ProposalDetailsData {
    proposal: any;
    project: any;
}

@Component({
    selector: 'app-proposal-details-dialog',
    templateUrl: './proposal-details-dialog.component.html',
    styleUrls: ['./proposal-details-dialog.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        FuseCardComponent,
    ],
})
export class ProposalDetailsDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<ProposalDetailsDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: ProposalDetailsData
    ) {}

    getProposalStatusBadgeClass(status: string): string {
        switch (status) {
            case 'sent':
                return 'bg-blue-100 text-blue-800';
            case 'accepted':
                return 'bg-green-100 text-green-800';
            case 'rejected':
                return 'bg-red-100 text-red-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    }

    getProposalStatusText(status: string): string {
        switch (status) {
            case 'sent':
                return 'Enviada';
            case 'accepted':
                return 'Aceptada';
            case 'rejected':
                return 'Rechazada';
            case 'pending':
                return 'Pendiente';
            default:
                return 'Desconocido';
        }
    }

    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    close(): void {
        this.dialogRef.close();
    }
} 