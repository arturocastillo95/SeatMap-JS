// ============================================
// SECTION CLASS VALIDATION TESTS
// ============================================
// Run these tests in the browser console to verify validation works

import { Section } from './Section.js';

export const SectionTests = {
  /**
   * Run all validation tests
   */
  runAll() {
    console.log('🧪 Running Section validation tests...\n');
    
    let passed = 0;
    let failed = 0;
    
    // Test 1: Valid section creation
    try {
      const section = new Section({
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        sectionId: 'Test Section'
      });
      console.log('✅ Test 1: Valid section creation - PASSED');
      passed++;
    } catch (error) {
      console.error('❌ Test 1: Valid section creation - FAILED:', error.message);
      failed++;
    }
    
    // Test 2: Invalid width (should throw)
    try {
      new Section({
        x: 0,
        y: 0,
        width: -10,
        height: 100
      });
      console.error('❌ Test 2: Invalid width validation - FAILED (no error thrown)');
      failed++;
    } catch (error) {
      if (error.message.includes('Invalid section width')) {
        console.log('✅ Test 2: Invalid width validation - PASSED');
        passed++;
      } else {
        console.error('❌ Test 2: Wrong error message:', error.message);
        failed++;
      }
    }
    
    // Test 3: Invalid rotation (should throw)
    try {
      const section = new Section({
        x: 0,
        y: 0,
        width: 100,
        height: 100
      });
      section.rotationDegrees = 400;
      console.error('❌ Test 3: Rotation validation - FAILED (no error thrown)');
      failed++;
    } catch (error) {
      if (error.message.includes('Rotation must be between 0 and 360')) {
        console.log('✅ Test 3: Rotation validation - PASSED');
        passed++;
      } else {
        console.error('❌ Test 3: Wrong error message:', error.message);
        failed++;
      }
    }
    
    // Test 4: Invalid GA capacity (should throw)
    try {
      const section = new Section({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        isGeneralAdmission: true,
        gaCapacity: 0
      });
      section.gaCapacity = -5;
      console.error('❌ Test 4: GA capacity validation - FAILED (no error thrown)');
      failed++;
    } catch (error) {
      if (error.message.includes('GA capacity must be a non-negative integer')) {
        console.log('✅ Test 4: GA capacity validation - PASSED');
        passed++;
      } else {
        console.error('❌ Test 4: Wrong error message:', error.message);
        failed++;
      }
    }
    
    // Test 5: Invalid row label type (should throw)
    try {
      const section = new Section({
        x: 0,
        y: 0,
        width: 100,
        height: 100
      });
      section.rowLabelType = 'invalid';
      console.error('❌ Test 5: Row label type validation - FAILED (no error thrown)');
      failed++;
    } catch (error) {
      if (error.message.includes('Row label type must be one of')) {
        console.log('✅ Test 5: Row label type validation - PASSED');
        passed++;
      } else {
        console.error('❌ Test 5: Wrong error message:', error.message);
        failed++;
      }
    }
    
    // Test 6: Empty section ID (should throw)
    try {
      const section = new Section({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        sectionId: 'Valid'
      });
      section.sectionId = '';
      console.error('❌ Test 6: Section ID validation - FAILED (no error thrown)');
      failed++;
    } catch (error) {
      if (error.message.includes('Section ID must be a non-empty string')) {
        console.log('✅ Test 6: Section ID validation - PASSED');
        passed++;
      } else {
        console.error('❌ Test 6: Wrong error message:', error.message);
        failed++;
      }
    }
    
    // Test 7: GA section resize validation
    try {
      const section = new Section({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        isGeneralAdmission: true
      });
      section.resize(200, 150);
      console.log('✅ Test 7: GA section resize - PASSED');
      passed++;
    } catch (error) {
      console.error('❌ Test 7: GA section resize - FAILED:', error.message);
      failed++;
    }
    
    // Test 8: Regular section resize (should throw)
    try {
      const section = new Section({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        isGeneralAdmission: false
      });
      section.resize(200, 150);
      console.error('❌ Test 8: Regular section resize prevention - FAILED (no error thrown)');
      failed++;
    } catch (error) {
      if (error.message.includes('Only GA sections can be resized directly')) {
        console.log('✅ Test 8: Regular section resize prevention - PASSED');
        passed++;
      } else {
        console.error('❌ Test 8: Wrong error message:', error.message);
        failed++;
      }
    }
    
    // Test 9: NaN/Infinity validation
    try {
      new Section({
        x: Infinity,
        y: 0,
        width: 100,
        height: 100
      });
      console.error('❌ Test 9: Infinity validation - FAILED (no error thrown)');
      failed++;
    } catch (error) {
      if (error.message.includes('Invalid section x position')) {
        console.log('✅ Test 9: Infinity validation - PASSED');
        passed++;
      } else {
        console.error('❌ Test 9: Wrong error message:', error.message);
        failed++;
      }
    }
    
    // Test 10: Array type validation
    try {
      const section = new Section({
        x: 0,
        y: 0,
        width: 100,
        height: 100
      });
      section.seats = 'not an array';
      console.error('❌ Test 10: Array type validation - FAILED (no error thrown)');
      failed++;
    } catch (error) {
      if (error.message.includes('Seats must be an array')) {
        console.log('✅ Test 10: Array type validation - PASSED');
        passed++;
      } else {
        console.error('❌ Test 10: Wrong error message:', error.message);
        failed++;
      }
    }
    
    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed out of ${passed + failed} total`);
    
    if (failed === 0) {
      console.log('🎉 All tests passed!');
    } else {
      console.log('⚠️ Some tests failed!');
    }
    
    return { passed, failed, total: passed + failed };
  },
  
  /**
   * Test individual validation
   */
  testValidation(testName, fn, expectedError) {
    try {
      fn();
      console.error(`❌ ${testName} - FAILED (no error thrown)`);
      return false;
    } catch (error) {
      if (error.message.includes(expectedError)) {
        console.log(`✅ ${testName} - PASSED`);
        return true;
      } else {
        console.error(`❌ ${testName} - Wrong error:`, error.message);
        return false;
      }
    }
  }
};

// To run tests in browser console:
// import { SectionTests } from './js/SectionTests.js';
// SectionTests.runAll();
