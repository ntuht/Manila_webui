# Manila Testing Guide

## Overview

This document provides comprehensive testing guidelines for the Manila project, covering test classification, commands, assertions, and examples.

## Test Classification

### Unit Tests
- **Purpose**: Test individual components and functions
- **Location**: `tests/test_*.cpp`
- **Framework**: Custom test harness (`test_harness.hpp`)
- **Coverage**: Core game logic, utilities, and data structures

### Integration Tests
- **Purpose**: Test component interactions and system behavior
- **Location**: `tests/test_*_integration.cpp`
- **Framework**: Custom test harness with game state setup
- **Coverage**: Game flow, strategy integration, and end-to-end scenarios

### Performance Tests
- **Purpose**: Measure and validate performance characteristics
- **Location**: Performance test scenarios in `SCENARIOS.md`
- **Framework**: Built-in profiling system
- **Coverage**: Execution time, memory usage, and scalability

### League System Tests
- **Purpose**: Test AI vs AI league functionality and strategy evaluation
- **Location**: `tests/test_league_*.cpp`
- **Framework**: Custom test harness with league system setup
- **Coverage**: League management, strategy registration, match execution, statistics, output formats

### Regression Tests
- **Purpose**: Ensure backward compatibility and prevent regressions
- **Location**: Version-specific test files
- **Framework**: Replay system and state validation
- **Coverage**: Version compatibility, data format changes

## Test Commands

### Building Tests
```bash
# Build all tests
cmake --build . --config Debug

# Build only tests
cmake --build . --config Debug --target manila_tests
```

### Running Tests
```bash
# Run all tests
./Debug/manila_tests.exe

# Run specific test file
./Debug/manila_tests.exe --gtest_filter="JsonIO*"

# Run league system tests
./Debug/manila_tests.exe --gtest_filter="League*"

# Run with verbose output
./Debug/manila_tests.exe --gtest_verbose
```

### Test Categories
```bash
# Run v1.3.0 specific tests
./Debug/manila_tests.exe --gtest_filter="*v1_3*"

# Run JSON IO tests
./Debug/manila_tests.exe --gtest_filter="JsonIO*"

# Run replay engine tests
./Debug/manila_tests.exe --gtest_filter="ReplayEngine*"

# Run config loader tests
./Debug/manila_tests.exe --gtest_filter="ConfigLoader*"
```

## Test Assertions

### Basic Assertions
```cpp
// Equality assertions
EXPECT_EQ(expected, actual);
ASSERT_EQ(expected, actual);

// Inequality assertions
EXPECT_NE(expected, actual);
ASSERT_NE(expected, actual);

// Boolean assertions
EXPECT_TRUE(condition);
EXPECT_FALSE(condition);

// Null pointer assertions
EXPECT_NULL(pointer);
EXPECT_NOT_NULL(pointer);
```

### Floating Point Assertions
```cpp
// Near equality for floating point
EXPECT_NEAR(expected, actual, tolerance);
ASSERT_NEAR(expected, actual, tolerance);

// Example: Test with 0.001 tolerance
EXPECT_NEAR(0.85, config.auction_config.alpha, 0.001);
```

### String Assertions
```cpp
// String equality
EXPECT_STREQ(expected, actual);
EXPECT_STRNE(expected, actual);

// String contains
EXPECT_TRUE(str.find("expected") != std::string::npos);
```

### Container Assertions
```cpp
// Size assertions
EXPECT_EQ(expected_size, container.size());

// Element assertions
EXPECT_EQ(expected_value, container[index]);

// Range assertions
EXPECT_TRUE(std::all_of(container.begin(), container.end(), predicate));
```

## Test Examples

### JSON IO Testing
```cpp
TEST(JsonIO, LoadSaveConfig) {
    // Create test configuration
    JsonConfig config;
    config.schema_rev = 3;
    config.auction_config.alpha = 0.9;
    
    // Save configuration
    std::string test_file = "test_config.json";
    ASSERT_TRUE(JsonIO::save_config(config, test_file));
    
    // Load configuration
    JsonConfig loaded_config;
    ASSERT_TRUE(JsonIO::load_config(test_file, loaded_config));
    
    // Verify loaded configuration
    EXPECT_EQ(loaded_config.schema_rev, 3);
    EXPECT_NEAR(loaded_config.auction_config.alpha, 0.9, 0.001);
    
    // Clean up
    std::filesystem::remove(test_file);
}
```

### Replay Engine Testing
```cpp
TEST(ReplayEngine, ExecuteReplay) {
    // Create replay script
    ReplayScript script;
    script.schema_rev = 3;
    
    // Add events
    nlohmann::json roll_event;
    roll_event["type"] = "roll";
    roll_event["dice"] = {4, 5, 6};
    script.events.emplace_back(ReplayEventType::Roll, roll_event);
    
    // Execute replay
    ReplayEngine engine;
    ReplayConfig config;
    config.mode = ReplayMode::Fast;
    config.verify = true;
    
    auto result = engine.execute_replay(script, config);
    
    // Verify results
    EXPECT_TRUE(result.success);
    EXPECT_EQ(result.moves_executed, 1);
    EXPECT_TRUE(result.verification_passed);
}
```

### Configuration Testing
```cpp
TEST(ConfigLoader, Validation) {
    ConfigLoader loader;
    
    // Valid configuration
    GameConfig valid_config = ConfigLoader::get_default_config();
    EXPECT_TRUE(loader.validate_config(valid_config));
    
    // Invalid configuration
    GameConfig invalid_config = valid_config;
    invalid_config.players = 5; // Invalid: max 4 players
    EXPECT_FALSE(loader.validate_config(invalid_config));
    
    auto errors = loader.get_validation_errors(invalid_config);
    EXPECT_FALSE(errors.empty());
}
```

## Performance Testing

### Basic Performance Test
```bash
# Run with profiling
./Debug/manila_demo.exe --profile --rounds 10

# Run with detailed profiling
./Debug/manila_demo.exe --profile-detail --rounds 100
```

### Performance Baseline
```bash
# Generate performance baseline
./Debug/manila_demo.exe --profile --audit json --audit-file baseline.jsonl

# Compare with previous baseline
./Debug/manila_demo.exe --profile --replay baseline.jsonl --verify
```

### Memory Testing
```bash
# Run with memory profiling (if available)
valgrind --tool=memcheck ./Debug/manila_demo.exe --rounds 5
```

## Test Data Management

### Test Files
- **Location**: `tests/data/` (if needed)
- **Format**: JSON, JSONL, or plain text
- **Naming**: `test_*.json`, `test_*.jsonl`
- **Cleanup**: Tests should clean up temporary files

### Test Fixtures
```cpp
class JsonIOTest : public ::testing::Test {
protected:
    void SetUp() override {
        test_file = "test_" + std::to_string(std::time(nullptr)) + ".json";
    }
    
    void TearDown() override {
        if (std::filesystem::exists(test_file)) {
            std::filesystem::remove(test_file);
        }
    }
    
    std::string test_file;
};
```

## Continuous Integration

### GitHub Actions (if applicable)
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: windows-latest
    steps:
    - uses: actions/checkout@v2
    - name: Build
      run: cmake --build . --config Debug
    - name: Test
      run: ./Debug/manila_tests.exe
```

### Local CI
```bash
# Run full test suite
./scripts/run_tests.sh

# Run specific test categories
./scripts/run_tests.sh --unit
./scripts/run_tests.sh --integration
./scripts/run_tests.sh --performance
```

## Test Coverage

### Coverage Goals
- **Unit Tests**: >90% line coverage
- **Integration Tests**: >80% path coverage
- **Performance Tests**: All critical paths
- **Regression Tests**: All version transitions

### Coverage Tools
```bash
# Generate coverage report (if available)
gcov src/*.cpp
lcov --capture --directory . --output-file coverage.info
genhtml coverage.info --output-directory coverage_html
```

## Debugging Tests

### Common Issues
1. **File Permissions**: Ensure test files can be created/deleted
2. **Path Issues**: Use absolute paths for test files
3. **Timing Issues**: Use appropriate timeouts for async operations
4. **Memory Leaks**: Check for proper cleanup in test teardown

### Debug Commands
```bash
# Run with debug output
./Debug/manila_tests.exe --gtest_verbose

# Run single test with debugger
gdb ./Debug/manila_tests.exe
(gdb) run --gtest_filter="JsonIO.LoadSaveConfig"
```

## Best Practices

### Test Organization
- One test file per major component
- Group related tests in test suites
- Use descriptive test names
- Keep tests independent and isolated

### Test Data
- Use minimal test data
- Avoid hardcoded values when possible
- Clean up test artifacts
- Use consistent naming conventions

### Assertions
- Use appropriate assertion types
- Provide clear error messages
- Test both positive and negative cases
- Verify side effects and state changes

### Performance
- Keep tests fast (<1 second per test)
- Use mocks for slow dependencies
- Profile test execution time
- Optimize test data size

## Maintenance

### Regular Tasks
- Update tests when adding new features
- Remove obsolete tests
- Refactor duplicate test code
- Update test documentation

### Version Compatibility
- Test backward compatibility
- Validate data format changes
- Update test data for new versions
- Maintain test version history

## Resources

### Documentation
- [Test Harness API](test_harness.hpp)
- [JSON Schema](JSON_SCHEMA.md)
- [Release Notes](RELEASE_NOTES.md)
- [Architecture Decisions](DECISIONS.md)

### Tools
- CMake build system
- Custom test harness
- JSON validation tools
- Performance profiling tools

### Support
- Check existing test examples
- Review test scenarios in SCENARIOS.md
- Consult architecture decisions
- Ask for help in project discussions
