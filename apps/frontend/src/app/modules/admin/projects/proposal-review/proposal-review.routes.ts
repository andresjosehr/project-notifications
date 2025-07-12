import { Routes } from '@angular/router';
import { ProposalReviewComponent } from './proposal-review.component';

export default [
    {
        path: ':projectId',
        component: ProposalReviewComponent,
        resolve: {
            // Aquí podrías agregar resolvers si necesitas cargar datos antes de mostrar el componente
        }
    }
] as Routes; 