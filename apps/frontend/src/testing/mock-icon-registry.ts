import { Injectable } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { of } from 'rxjs';

/**
 * Mock MatIconRegistry for testing
 * This prevents HTTP requests for icon sets during tests
 */
@Injectable()
export class MockMatIconRegistry extends MatIconRegistry {
  override addSvgIconSet(): MatIconRegistry {
    return this;
  }

  override addSvgIconSetInNamespace(): MatIconRegistry {
    return this;
  }

  override addSvgIcon(): MatIconRegistry {
    return this;
  }

  override addSvgIconInNamespace(): MatIconRegistry {
    return this;
  }

  override getNamedSvgIcon(): any {
    // Return a simple observable with a mock SVG element
    const mockSvgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    mockSvgElement.innerHTML = '<path d="M0 0h24v24H0z" fill="none"/>';
    return of(mockSvgElement);
  }

  override getSvgIconFromUrl(): any {
    // Return a simple observable with a mock SVG element
    const mockSvgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    mockSvgElement.innerHTML = '<path d="M0 0h24v24H0z" fill="none"/>';
    return of(mockSvgElement);
  }
}

/**
 * Provider function to replace MatIconRegistry with mock in tests
 */
export function provideMockMatIconRegistry() {
  return {
    provide: MatIconRegistry,
    useClass: MockMatIconRegistry
  };
}