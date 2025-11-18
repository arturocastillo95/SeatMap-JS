# Library Structure Proposal

## Overview

This document outlines the restructuring plan to transform SeatMap JS into a reusable JavaScript library.

## ✅ Current Implementation (Phase 1 Complete)

**Status**: Phase 1 restructuring is complete. Code has been reorganized for better maintainability while keeping the demo application fully functional.

### Actual Structure (as of Nov 17, 2025)

```
venue-map-js/
├── src/                          # Library source code (organized)
│   ├── core/                     # Core infrastructure
│   │   ├── Section.js           # Section class
│   │   ├── SectionTests.js      # Section tests
│   │   ├── config.js            # Configuration constants
│   │   ├── sceneSetup.js        # Grid and scene setup
│   │   ├── state.js             # Global state management
│   │   └── utils.js             # Utility functions
│   │
│   └── managers/                 # All feature managers
│       ├── ResizeHandleManager.js
│       ├── SeatManager.js
│       ├── SectionFactory.js
│       ├── SectionInteractionHandler.js
│       ├── SectionTransformations.js
│       ├── UnderlayManager.js
│       ├── alignmentManager.js
│       ├── fileManager.js
│       ├── interactionManager.js
│       ├── modeManager.js
│       ├── sectionManager.js
│       └── toolManager.js
│
├── js/                           # Application entry point
│   └── main.js                   # Demo application bootstrapper
│
├── index.html                    # Demo application UI
├── docs/                         # Documentation
├── backups/                      # Historical backups
└── .github/                      # GitHub Actions
```

### Key Achievements

- ✅ **Clear separation**: Core vs managers
- ✅ **No breaking changes**: Demo app still works
- ✅ **All imports updated**: Proper relative paths
- ✅ **Better organization**: Easy to find files
- ✅ **Future-ready**: Easy to add library entry point

### Import Pattern Examples

**From managers to core:**
```javascript
import { State } from '../core/state.js';
import { Utils } from '../core/utils.js';
import { CONFIG } from '../core/config.js';
```

**From main.js to organized code:**
```javascript
import { State } from '../src/core/state.js';
import { ToolManager } from '../src/managers/toolManager.js';
```

---

## Current Structure Issues

1. **Flat structure** - All managers mixed with demo/example code
2. **No clear separation** - Library code mixed with application code
3. **No entry point** - No single file to import the library
4. **Config mixed with code** - Configuration not externalized
5. **Demo-specific code** - Main.js, sceneSetup.js are demo-specific

## Proposed Library Structure

```
venue-map-js/
├── src/                          # Library source code
│   ├── core/                     # Core library classes
│   │   ├── VenueMap.js          # Main library class (entry point)
│   │   ├── Section.js           # Section class
│   │   ├── State.js             # State management
│   │   └── EventEmitter.js      # Event system
│   │
│   ├── managers/                 # Feature managers
│   │   ├── SectionManager.js
│   │   ├── SeatManager.js
│   │   ├── FileManager.js
│   │   ├── UnderlayManager.js
│   │   ├── AlignmentManager.js
│   │   ├── ToolManager.js
│   │   ├── ModeManager.js
│   │   └── InteractionManager.js
│   │
│   ├── factories/                # Object creation
│   │   ├── SectionFactory.js
│   │   └── SeatFactory.js
│   │
│   ├── handlers/                 # Interaction handlers
│   │   ├── SectionInteractionHandler.js
│   │   ├── ResizeHandleManager.js
│   │   └── SectionTransformations.js
│   │
│   ├── renderers/                # Rendering logic
│   │   ├── SceneRenderer.js
│   │   └── GridRenderer.js
│   │
│   ├── utils/                    # Utility functions
│   │   ├── index.js
│   │   ├── geometry.js
│   │   ├── validation.js
│   │   └── conversion.js
│   │
│   ├── constants/                # Constants and config
│   │   ├── config.js
│   │   ├── visual.js
│   │   └── defaults.js
│   │
│   └── index.js                  # Main library entry point
│
├── examples/                     # Demo applications
│   ├── basic/                    # Basic example
│   │   ├── index.html
│   │   ├── app.js
│   │   └── styles.css
│   │
│   └── advanced/                 # Advanced example (current demo)
│       ├── index.html
│       ├── app.js
│       └── styles.css
│
├── dist/                         # Built/bundled library (generated)
│   ├── venue-map.js             # UMD bundle
│   ├── venue-map.min.js         # Minified
│   ├── venue-map.esm.js         # ES module
│   └── venue-map.d.ts           # TypeScript definitions
│
├── tests/                        # Test suite
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docs/                         # Documentation
│   ├── API.md                   # API reference
│   ├── GUIDE.md                 # User guide
│   ├── CHANGELOG.md             # Version history
│   └── EXAMPLES.md              # Code examples
│
├── package.json                 # NPM package config
├── rollup.config.js             # Build configuration
├── tsconfig.json                # TypeScript config
└── README.md                    # Library documentation

```

## Main Library Entry Point (src/index.js)

```javascript
import VenueMap from './core/VenueMap.js';
import { CONFIG, VISUAL_CONFIG } from './constants/config.js';
import * as Utils from './utils/index.js';

// Named exports
export { VenueMap, CONFIG, VISUAL_CONFIG, Utils };

// Default export
export default VenueMap;
```

## Core VenueMap Class (src/core/VenueMap.js)

```javascript
export default class VenueMap {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.options = { ...defaultOptions, ...options };
    
    // Initialize managers
    this.state = new State();
    this.sectionManager = new SectionManager(this);
    this.fileManager = new FileManager(this);
    this.underlayManager = new UnderlayManager(this);
    // ... other managers
    
    this.init();
  }
  
  // Public API methods
  async init() { /* ... */ }
  createSection(x, y, width, height) { /* ... */ }
  deleteSection(section) { /* ... */ }
  save() { /* ... */ }
  load(data) { /* ... */ }
  destroy() { /* ... */ }
  
  // Event methods
  on(event, callback) { /* ... */ }
  off(event, callback) { /* ... */ }
  emit(event, data) { /* ... */ }
}
```

## Usage as Library

```javascript
// ES Module import
import VenueMap from 'venue-map-js';

// Create instance
const venueMap = new VenueMap('#container', {
  width: 1920,
  height: 1080,
  background: '#0f0f13',
  grid: {
    enabled: true,
    size: 30,
    color: 0x1a1a1a
  }
});

// Use API
const section = venueMap.createSection(100, 100, 500, 300);
venueMap.on('sectionSelected', (data) => {
  console.log('Section selected:', data.section);
});

// Save/Load
const mapData = venueMap.save();
venueMap.load(mapData);
```

## Migration Plan

### Phase 1: Restructure (Current Sprint)
1. Create new directory structure
2. Move files to appropriate locations
3. Update import paths
4. Create main VenueMap class
5. Test that demo still works

### Phase 2: API Design (Next Sprint)
1. Design public API surface
2. Create TypeScript definitions
3. Add JSDoc comments
4. Create API documentation

### Phase 3: Build Setup (Sprint 3)
1. Setup Rollup/Webpack for bundling
2. Configure UMD, ESM, and CJS outputs
3. Add minification
4. Setup npm package

### Phase 4: Examples & Docs (Sprint 4)
1. Create basic example
2. Create advanced example (current demo)
3. Write comprehensive API docs
4. Create tutorials

### Phase 5: Testing & Publishing (Sprint 5)
1. Write unit tests
2. Write integration tests
3. Setup CI/CD
4. Publish to npm

## Benefits of New Structure

### For Library Users
- ✅ **Single import** - `import VenueMap from 'venue-map-js'`
- ✅ **Clear API** - Well-defined public interface
- ✅ **Tree-shakeable** - Import only what you need
- ✅ **TypeScript support** - Full type definitions
- ✅ **Multiple formats** - UMD, ESM, CJS

### For Maintainers
- ✅ **Clear separation** - Library vs demo code
- ✅ **Better organization** - Logical folder structure
- ✅ **Easier testing** - Isolated components
- ✅ **Modular** - Each manager is independent
- ✅ **Scalable** - Easy to add new features

### For Contributors
- ✅ **Easy to understand** - Clear folder structure
- ✅ **Find code faster** - Logical organization
- ✅ **Examples included** - Learn by example
- ✅ **Documentation** - API reference available

## Breaking Changes

The restructuring will be a **major version bump** (v3.0.0):

- File paths will change
- Direct imports of managers will need updates
- New instantiation pattern (class-based)
- Configuration structure may change

## Backward Compatibility

We can maintain backward compatibility by:

1. Keep current code in `v2/` folder
2. Create adapters for old API
3. Deprecation warnings for 1-2 versions
4. Clear migration guide

## Next Steps

1. **Review** - Team reviews this proposal
2. **Approval** - Get sign-off on structure
3. **Create branch** - `feature/library-structure`
4. **Implement Phase 1** - File restructuring
5. **Test** - Ensure demo works with new structure
6. **Document** - Update all docs
7. **Merge** - Merge to main when stable

## Questions to Answer

1. Do we want TypeScript or stick with JavaScript + JSDoc?
2. Which bundler? (Rollup recommended for libraries)
3. Target browsers/Node versions?
4. License? (Currently unlicensed)
5. Package name on npm? (`venue-map-js` or `@yourorg/venue-map`)
6. Versioning strategy? (Semantic versioning)

## References

- [Creating a JavaScript Library](https://github.com/frehner/modern-guide-to-packaging-js-library)
- [Rollup for Libraries](https://rollupjs.org/)
- [Library Best Practices](https://github.com/goldbergyoni/nodebestpractices)
