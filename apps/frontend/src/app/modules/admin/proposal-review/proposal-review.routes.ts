import { Routes } from '@angular/router';
import { ProposalReviewComponent } from './proposal-review.component';

export default [
    {
        path: ':projectId',
        component: ProposalReviewComponent,
    },
] as Routes;