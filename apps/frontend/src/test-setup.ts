import { NgModule } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

// Setup for tests - Mock Icon Registry
export function setupTestIconRegistry(matIconRegistry: MatIconRegistry, domSanitizer: DomSanitizer) {
  // Mock the addSvgIconSet and addSvgIconSetInNamespace methods to prevent HTTP requests
  spyOn(matIconRegistry, 'addSvgIconSet').and.returnValue(matIconRegistry);
  spyOn(matIconRegistry, 'addSvgIconSetInNamespace').and.returnValue(matIconRegistry);
  
  // Mock the getNamedSvgIcon method to return a simple SVG element
  spyOn(matIconRegistry, 'getNamedSvgIcon').and.returnValue(
    new Promise((resolve) => {
      const svgElement = document.createElement('svg');
      svgElement.innerHTML = '<path></path>'; // Simple mock SVG content
      resolve(svgElement);
    })
  );
}

@NgModule({})
export class TestIconModule {
  constructor(matIconRegistry: MatIconRegistry, domSanitizer: DomSanitizer) {
    setupTestIconRegistry(matIconRegistry, domSanitizer);
  }
}