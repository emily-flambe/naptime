# GitHub Copilot Review Instructions

## Primary Review Focus: Simplicity and Design Quality

### Critical Review Areas

#### 1. Simplicity Enforcement
- **Flag overcomplicated solutions** where simple approaches would suffice
- **Identify unnecessary abstractions** and layers that don't add real value
- **Question every design pattern** - is it actually needed or just showing off?
- **Prefer straightforward implementations** over clever or complex ones
- **Challenge any code that requires extensive documentation to understand**

#### 2. Overengineering Detection
- **Abstract classes or interfaces** that only have one implementation
- **Factory patterns** where simple constructors would work
- **Complex inheritance hierarchies** instead of composition
- **Premature optimization** without performance requirements
- **Generic solutions** for specific, simple problems
- **Configuration systems** for values that never change
- **Plugin architectures** without multiple plugins
- **Event systems** for simple function calls

#### 3. Poor Design Choices
- **God classes** that do too many things
- **Circular dependencies** between modules
- **Deep nesting** that could be flattened
- **Magic numbers** without clear constants
- **Inconsistent naming** across the codebase
- **Mixed abstraction levels** within functions
- **Tight coupling** between unrelated components

#### 4. Hardcoded Success Simulation (CRITICAL)
- **Mock implementations** that always return success
- **Hardcoded test data** that masks real functionality gaps
- **Try-catch blocks** that suppress errors without proper handling
- **Default fallbacks** that hide failures
- **Stub functions** that return fake success responses
- **Conditional logic** that always takes the "happy path"
- **Test doubles** that don't reflect real-world behavior

### Specific Red Flags

#### Code Smells to Flag Immediately

1. **Functions that never return errors**
   - `catch (error) { return null; }` - Swallowing errors
   - `try { ... } catch { }` - Empty catch blocks
   - Functions that always return success status
   - API calls without error handling

2. **Fake data masquerading as real**
   - Hardcoded JSON responses in production code
   - `if (isDevelopment) return mockData;` without else clause
   - Random data generators in non-test files
   - Placeholder values that never get replaced

3. **Unnecessary abstraction layers**
   - Wrapper classes that just pass through calls
   - Service layers that only call one other service
   - Repository pattern with single database table
   - Facades that don't simplify anything

4. **Over-configured simple values**
   - Config files for single boolean flags
   - Environment variables for values that never change
   - Strategy patterns for two fixed options
   - Dependency injection for static utilities

5. **Premature optimization patterns**
   - Caching before measuring performance
   - Object pools for rarely-created objects
   - Micro-optimizations in non-hot paths
   - Complex algorithms for small datasets

6. **Copy-paste inheritance**
   - Multiple classes with 90% identical code
   - Switch statements checking object types
   - Repeated validation logic across files
   - Duplicated error handling patterns

7. **Testing anti-patterns**
   - Tests that never assert failures
   - Mocks that always succeed
   - `expect(true).toBe(true)` tests
   - Tests skipped with `xit` or `.skip`

8. **Complexity without purpose**
   - Nested ternary operators
   - Functions with >5 parameters
   - Classes with >10 methods doing unrelated things
   - If-else chains that could be simple maps

9. **Hidden control flow**
   - Side effects in getters
   - Business logic in constructors
   - State mutations in render methods
   - Global variables controlling behavior

10. **Security through obscurity**
    - Base64 encoding as "encryption"
    - Client-side "validation" only
    - Hardcoded credentials anywhere
    - Security checks that can be bypassed


### Review Questions to Ask

#### For Every Function/Class
1. **Can this be simpler?** Is there a more direct way?
2. **What does this actually do?** Can it be explained in one sentence?
3. **Is this abstraction necessary?** Does it solve a real problem?
4. **Does this handle real failure cases?** Or just simulate success?

#### For Architecture Decisions
1. **Why is this pattern needed?** What specific problem does it solve?
2. **How many implementations exist?** If one, why abstract it?
3. **What happens when this fails?** Are failures properly handled?
4. **Could a beginner understand this?** If not, is the complexity justified?

#### For Configuration and Options
1. **Do these options ever change?** If not, hardcode them
2. **Are there real use cases for each option?** Remove unused ones
3. **Is this configurability worth the complexity?** Often the answer is no

### Acceptable Complexity Cases

#### When Complexity is Justified
- **Performance critical paths** with measured bottlenecks
- **Multiple real implementations** that genuinely differ
- **External API integration** that requires error handling
- **Security-sensitive code** that needs defense in depth
- **Cross-platform compatibility** with genuine platform differences

#### Documentation Required for Complexity
If complexity cannot be avoided, require:
- **Clear justification** for why simple approach won't work
- **Performance measurements** justifying optimizations
- **Error handling documentation** for all failure modes
- **Examples** showing real-world usage scenarios

### Anti-Patterns to Reject

#### Immediately Reject These Patterns
- **Always-successful functions** that never fail in tests
- **Configuration for constants** that never change
- **Abstraction layers** with single implementations
- **Generic solutions** without multiple use cases
- **Framework-like code** in application logic
- **Premature optimizations** without benchmarks
- **Clever code** that prioritizes brevity over clarity

### Success Criteria

#### Good Code Characteristics
- **Readable by beginners** in the programming language
- **Single responsibility** per function/class
- **Obvious naming** that explains intent
- **Direct problem solving** without unnecessary indirection
- **Real error handling** that deals with actual failures
- **Minimal dependencies** between components
- **Testable** without complex mocking

#### Review Success Metrics
- **Reduced complexity** in each review cycle
- **Fewer abstractions** over time
- **More straightforward code** paths
- **Better error handling** for real scenarios
- **Simpler test setups** without extensive mocking

## Review Process

1. **Start with the simplest solution** - can this problem be solved more directly?
2. **Question every abstraction** - is this layer actually needed?
3. **Verify error handling** - does this handle real failures or just simulate success?
4. **Check for overengineering** - is this solving a problem that doesn't exist?
5. **Ensure testability** - can this be tested without complex setup?

Remember: **The best code is code that doesn't exist.** The second-best code is simple, direct, and obvious.
