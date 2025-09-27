Imports System.Threading
Imports System.Text.Json
Imports Microsoft.Extensions.Logging
Imports CliWrap
Imports QualityAssuranceAgent.Core.Models
Imports QualityAssuranceAgent.Core.Interfaces

Namespace QualityAssuranceAgent.BuildVerification

    ''' <summary>
    ''' Build verification module for Next.js applications with comprehensive checks
    ''' </summary>
    Public Class NextJSBuildVerificationModule
        Implements IBuildVerificationModule

        Private ReadOnly _logger As ILogger(Of NextJSBuildVerificationModule)

        Public ReadOnly Property Name As String = "Next.js Build Verification" Implements IQAModule.Name
        Public ReadOnly Property Version As String = "1.0.0" Implements IQAModule.Version
        Public ReadOnly Property SupportedFileTypes As IReadOnlyList(Of String) = {"package.json", "next.config.js", "tsconfig.json"}.ToList() Implements IQAModule.SupportedFileTypes

        Public Sub New(logger As ILogger(Of NextJSBuildVerificationModule))
            _logger = logger OrElse throw New ArgumentNullException(NameOf(logger))
        End Sub

        Public Function CanHandle(filePath As String) As Boolean Implements IQAModule.CanHandle
            Dim fileName = Path.GetFileName(filePath).ToLowerInvariant()
            Return SupportedFileTypes.Any(Function(ext) fileName.EndsWith(ext))
        End Function

        Public Async Function RunAsync(config As QAAgentConfig, cancellationToken As CancellationToken) As Task(Of List(Of QualityIssue)) Implements IQAModule.RunAsync
            Dim issues As New List(Of QualityIssue)

            Try
                _logger.LogInformation("🔍 Running Next.js build verification...")

                ' Check if this is a Next.js project
                If Not IsNextJSProject(config.ProjectPath) Then
                    issues.Add(New QualityIssue With {
                        .Severity = IssueSeverity.Medium,
                        .Category = IssueCategory.Configuration,
                        .Title = "Not a Next.js Project",
                        .Description = "Project does not appear to be a Next.js application",
                        .FilePath = Path.Combine(config.ProjectPath, "package.json"),
                        .Source = Name,
                        .RecommendedAction = "Verify project type or configure appropriate build verification module"
                    })
                    Return issues
                End If

                ' Verify build
                Dim buildResult = Await VerifyBuildAsync(config.ProjectPath, config, cancellationToken)
                If Not buildResult.Success Then
                    For Each errorMsg In buildResult.Errors
                        issues.Add(New QualityIssue With {
                            .Severity = IssueSeverity.Critical,
                            .Category = IssueCategory.BuildProcess,
                            .Title = "Build Failure",
                            .Description = errorMsg,
                            .Source = Name,
                            .RecommendedAction = "Fix build errors and dependencies"
                        })
                    Next
                End If

                ' Check configuration
                Dim configIssues = Await CheckConfigurationAsync(config.ProjectPath, cancellationToken)
                issues.AddRange(configIssues)

                ' Analyze dependencies
                Dim dependencyResult = Await AnalyzeDependenciesAsync(config.ProjectPath, cancellationToken)
                issues.AddRange(ConvertDependencyIssuesToQualityIssues(dependencyResult))

                Return issues

            Catch ex As Exception
                _logger.LogError(ex, "❌ Build verification failed")
                issues.Add(New QualityIssue With {
                    .Severity = IssueSeverity.Critical,
                    .Category = IssueCategory.BuildProcess,
                    .Title = "Build Verification Exception",
                    .Description = $"Build verification failed with exception: {ex.Message}",
                    .Source = Name,
                    .RecommendedAction = "Check build environment and configuration"
                })
                Return issues
            End Try
        End Function

        Public Async Function VerifyBuildAsync(projectPath As String, config As QAAgentConfig, cancellationToken As CancellationToken) As Task(Of BuildResult) Implements IBuildVerificationModule.VerifyBuildAsync
            Dim result As New BuildResult()
            Dim stopwatch = Diagnostics.Stopwatch.StartNew()

            Try
                _logger.LogInformation("🏗️  Starting Next.js build process...")

                ' Clean previous build
                _logger.LogInformation("🧹 Cleaning previous build artifacts...")
                Await RunNpmCommand(projectPath, {"run", "clean"}, cancellationToken, suppressErrors:=True)

                ' Install dependencies
                _logger.LogInformation("📦 Installing dependencies...")
                Dim installResult = Await RunNpmCommand(projectPath, {"ci"}, cancellationToken)
                If Not installResult.Success Then
                    result.Errors.Add($"Dependency installation failed: {installResult.Output}")
                    result.Success = False
                    GoTo FinalizeBuild
                End If

                ' Type checking (if TypeScript project)
                If File.Exists(Path.Combine(projectPath, "tsconfig.json")) Then
                    _logger.LogInformation("🔍 Running TypeScript type checking...")
                    Dim typeCheckResult = Await RunNpmCommand(projectPath, {"run", "type-check"}, cancellationToken, suppressErrors:=True)
                    If Not typeCheckResult.Success Then
                        result.Warnings.Add($"TypeScript type checking issues: {typeCheckResult.Output}")
                    End If
                End If

                ' Lint checking
                _logger.LogInformation("🔍 Running ESLint...")
                Dim lintResult = Await RunNpmCommand(projectPath, {"run", "lint"}, cancellationToken, suppressErrors:=True)
                If Not lintResult.Success Then
                    result.Warnings.Add($"Linting issues found: {lintResult.Output}")
                End If

                ' Main build
                _logger.LogInformation("🏗️  Building Next.js application...")
                Dim buildResult = Await RunNpmCommand(projectPath, {"run", "build"}, cancellationToken)
                
                result.Success = buildResult.Success
                result.Output = buildResult.Output

                If Not buildResult.Success Then
                    result.Errors.Add($"Build failed: {buildResult.Output}")
                Else
                    ' Analyze build output
                    Dim buildDir = Path.Combine(projectPath, ".next")
                    If Directory.Exists(buildDir) Then
                        result.BuildSize = GetDirectorySize(buildDir)
                        result.ArtifactsGenerated = Directory.GetFiles(buildDir, "*", SearchOption.AllDirectories).ToList()
                        _logger.LogInformation($"📊 Build size: {result.BuildSize / 1024 / 1024:F2} MB")
                    End If
                End If

FinalizeBuild:
                stopwatch.Stop()
                result.Duration = stopwatch.Elapsed
                _logger.LogInformation($"⏱️  Build completed in {result.Duration.TotalSeconds:F2} seconds")

                Return result

            Catch ex As Exception
                stopwatch.Stop()
                result.Duration = stopwatch.Elapsed
                result.Success = False
                result.Errors.Add($"Build exception: {ex.Message}")
                _logger.LogError(ex, "❌ Build verification exception")
                Return result
            End Try
        End Function

        Public Async Function AnalyzeDependenciesAsync(projectPath As String, cancellationToken As CancellationToken) As Task(Of DependencyAnalysisResult) Implements IBuildVerificationModule.AnalyzeDependenciesAsync
            Dim result As New DependencyAnalysisResult()

            Try
                _logger.LogInformation("📋 Analyzing project dependencies...")

                ' Read package.json
                Dim packageJsonPath = Path.Combine(projectPath, "package.json")
                If Not File.Exists(packageJsonPath) Then
                    Return result
                End If

                Dim packageJsonContent = Await File.ReadAllTextAsync(packageJsonPath, cancellationToken)
                Dim packageJson = JsonSerializer.Deserialize(Of JsonElement)(packageJsonContent)

                ' Count total dependencies
                Dim deps = New List(Of String)
                If packageJson.TryGetProperty("dependencies", out Dim dependencies) Then
                    For Each prop In dependencies.EnumerateObject()
                        deps.Add($"{prop.Name}@{prop.Value.GetString()}")
                    Next
                End If
                If packageJson.TryGetProperty("devDependencies", out Dim devDependencies) Then
                    For Each prop In devDependencies.EnumerateObject()
                        deps.Add($"{prop.Name}@{prop.Value.GetString()}")
                    Next
                End If

                result.TotalDependencies = deps.Count

                ' Check for outdated packages
                _logger.LogInformation("🔍 Checking for outdated packages...")
                Dim outdatedResult = Await RunNpmCommand(projectPath, {"outdated", "--json"}, cancellationToken, suppressErrors:=True)
                If outdatedResult.Success AndAlso Not String.IsNullOrEmpty(outdatedResult.Output) Then
                    Try
                        Dim outdatedJson = JsonSerializer.Deserialize(Of JsonElement)(outdatedResult.Output)
                        For Each prop In outdatedJson.EnumerateObject()
                            Dim packageInfo = prop.Value
                            result.OutdatedDependencies.Add(New OutdatedDependency With {
                                .Name = prop.Name,
                                .CurrentVersion = If(packageInfo.TryGetProperty("current", out Dim current), current.GetString(), "unknown"),
                                .LatestVersion = If(packageInfo.TryGetProperty("latest", out Dim latest), latest.GetString(), "unknown"),
                                .UpdateType = DetermineUpdateType(current.GetString(), latest.GetString())
                            })
                        Next
                    Catch jsonEx As Exception
                        _logger.LogWarning($"Failed to parse outdated packages JSON: {jsonEx.Message}")
                    End Try
                End If

                ' Security audit
                _logger.LogInformation("🔒 Running security audit...")
                Dim auditResult = Await RunNpmCommand(projectPath, {"audit", "--json"}, cancellationToken, suppressErrors:=True)
                If auditResult.Success AndAlso Not String.IsNullOrEmpty(auditResult.Output) Then
                    Try
                        Dim auditJson = JsonSerializer.Deserialize(Of JsonElement)(auditResult.Output)
                        If auditJson.TryGetProperty("vulnerabilities", out Dim vulnerabilities) Then
                            For Each vuln In vulnerabilities.EnumerateObject()
                                Dim vulnInfo = vuln.Value
                                result.VulnerableDependencies.Add(New VulnerableDependency With {
                                    .Name = vuln.Name,
                                    .Version = If(vulnInfo.TryGetProperty("via", out Dim via) AndAlso via.ValueKind = JsonValueKind.Array AndAlso via.GetArrayLength() > 0, via.EnumerateArray().First().GetString(), "unknown"),
                                    .Severity = If(vulnInfo.TryGetProperty("severity", out Dim severity), severity.GetString(), "unknown"),
                                    .Description = If(vulnInfo.TryGetProperty("title", out Dim title), title.GetString(), "Security vulnerability detected")
                                })
                            Next
                        End If
                    Catch jsonEx As Exception
                        _logger.LogWarning($"Failed to parse audit JSON: {jsonEx.Message}")
                    End Try
                End If

                _logger.LogInformation($"📊 Dependencies: {result.TotalDependencies} total, {result.OutdatedDependencies.Count} outdated, {result.VulnerableDependencies.Count} vulnerable")
                Return result

            Catch ex As Exception
                _logger.LogError(ex, "❌ Dependency analysis failed")
                Return result
            End Try
        End Function

        Public Async Function CheckConfigurationAsync(projectPath As String, cancellationToken As CancellationToken) As Task(Of List(Of QualityIssue)) Implements IBuildVerificationModule.CheckConfigurationAsync
            Dim issues As New List(Of QualityIssue)

            Try
                _logger.LogInformation("⚙️  Checking Next.js configuration...")

                ' Check next.config.js
                Dim nextConfigPath = Path.Combine(projectPath, "next.config.js")
                If File.Exists(nextConfigPath) Then
                    Dim configContent = Await File.ReadAllTextAsync(nextConfigPath, cancellationToken)
                    
                    ' Check for security headers
                    If Not configContent.Contains("securityHeaders") AndAlso Not configContent.Contains("X-Frame-Options") Then
                        issues.Add(New QualityIssue With {
                            .Severity = IssueSeverity.Medium,
                            .Category = IssueCategory.Security,
                            .Title = "Missing Security Headers",
                            .Description = "Next.js configuration missing security headers",
                            .FilePath = nextConfigPath,
                            .Source = Name,
                            .RecommendedAction = "Add security headers in next.config.js",
                            .AutoFixable = True
                        })
                    End If

                    ' Check for content security policy
                    If Not configContent.Contains("contentSecurityPolicy") Then
                        issues.Add(New QualityIssue With {
                            .Severity = IssueSeverity.Medium,
                            .Category = IssueCategory.Security,
                            .Title = "Missing Content Security Policy",
                            .Description = "No Content Security Policy configured",
                            .FilePath = nextConfigPath,
                            .Source = Name,
                            .RecommendedAction = "Configure CSP in next.config.js"
                        })
                    End If
                End If

                ' Check TypeScript configuration
                Dim tsConfigPath = Path.Combine(projectPath, "tsconfig.json")
                If File.Exists(tsConfigPath) Then
                    Dim tsConfigContent = Await File.ReadAllTextAsync(tsConfigPath, cancellationToken)
                    Dim tsConfig = JsonSerializer.Deserialize(Of JsonElement)(tsConfigContent)

                    ' Check strict mode
                    If tsConfig.TryGetProperty("compilerOptions", out Dim compilerOptions) Then
                        If Not compilerOptions.TryGetProperty("strict", out Dim strict) OrElse Not strict.GetBoolean() Then
                            issues.Add(New QualityIssue With {
                                .Severity = IssueSeverity.Medium,
                                .Category = IssueCategory.CodeQuality,
                                .Title = "TypeScript Strict Mode Disabled",
                                .Description = "TypeScript strict mode is not enabled",
                                .FilePath = tsConfigPath,
                                .Source = Name,
                                .RecommendedAction = "Enable strict mode in tsconfig.json",
                                .AutoFixable = True
                            })
                        End If
                    End If
                End If

                ' Check environment configuration
                Dim envPath = Path.Combine(projectPath, ".env")
                Dim envExamplePath = Path.Combine(projectPath, ".env.example")
                
                If File.Exists(envPath) AndAlso Not File.Exists(envExamplePath) Then
                    issues.Add(New QualityIssue With {
                        .Severity = IssueSeverity.Low,
                        .Category = IssueCategory.Documentation,
                        .Title = "Missing .env.example",
                        .Description = "No .env.example file found for environment variable documentation",
                        .FilePath = envPath,
                        .Source = Name,
                        .RecommendedAction = "Create .env.example file documenting required environment variables"
                    })
                End If

                Return issues

            Catch ex As Exception
                _logger.LogError(ex, "❌ Configuration check failed")
                issues.Add(New QualityIssue With {
                    .Severity = IssueSeverity.Medium,
                    .Category = IssueCategory.Configuration,
                    .Title = "Configuration Check Failed",
                    .Description = $"Failed to analyze configuration: {ex.Message}",
                    .Source = Name,
                    .RecommendedAction = "Check file permissions and project structure"
                })
                Return issues
            End Try
        End Function

        Private Function IsNextJSProject(projectPath As String) As Boolean
            Dim packageJsonPath = Path.Combine(projectPath, "package.json")
            If Not File.Exists(packageJsonPath) Then Return False

            Try
                Dim content = File.ReadAllText(packageJsonPath)
                Return content.Contains("""next""") OrElse content.Contains("next")
            Catch
                Return False
            End Try
        End Function

        Private Async Function RunNpmCommand(projectPath As String, args As String(), cancellationToken As CancellationToken, Optional suppressErrors As Boolean = False) As Task(Of (Success As Boolean, Output As String))
            Try
                Dim result = Await Cli.Wrap("npm")
                    .WithArguments(args)
                    .WithWorkingDirectory(projectPath)
                    .ExecuteBufferedAsync(cancellationToken)

                Return (result.ExitCode = 0, result.StandardOutput + result.StandardError)

            Catch ex As Exception
                If Not suppressErrors Then
                    _logger.LogError(ex, $"❌ npm command failed: npm {String.Join(" ", args)}")
                End If
                Return (False, ex.Message)
            End Try
        End Function

        Private Function GetDirectorySize(directoryPath As String) As Long
            If Not Directory.Exists(directoryPath) Then Return 0

            Try
                Return Directory.GetFiles(directoryPath, "*", SearchOption.AllDirectories).Sum(Function(file) New FileInfo(file).Length)
            Catch
                Return 0
            End Try
        End Function

        Private Function DetermineUpdateType(currentVersion As String, latestVersion As String) As String
            Try
                Dim current = Version.Parse(currentVersion.TrimStart("^~".ToCharArray()))
                Dim latest = Version.Parse(latestVersion.TrimStart("^~".ToCharArray()))

                If latest.Major > current.Major Then Return "major"
                If latest.Minor > current.Minor Then Return "minor"
                If latest.Build > current.Build Then Return "patch"
                Return "none"
            Catch
                Return "unknown"
            End Try
        End Function

        Private Function ConvertDependencyIssuesToQualityIssues(dependencyResult As DependencyAnalysisResult) As List(Of QualityIssue)
            Dim issues As New List(Of QualityIssue)

            ' Vulnerable dependencies
            For Each vuln In dependencyResult.VulnerableDependencies
                Dim severity = If(vuln.Severity?.ToLower() = "critical", IssueSeverity.Critical,
                                 If(vuln.Severity?.ToLower() = "high", IssueSeverity.High,
                                    If(vuln.Severity?.ToLower() = "moderate", IssueSeverity.Medium, IssueSeverity.Low)))

                issues.Add(New QualityIssue With {
                    .Severity = severity,
                    .Category = IssueCategory.Security,
                    .Title = $"Vulnerable Dependency: {vuln.Name}",
                    .Description = $"Security vulnerability in {vuln.Name}@{vuln.Version}: {vuln.Description}",
                    .Source = Name,
                    .RecommendedAction = If(Not String.IsNullOrEmpty(vuln.FixedInVersion), 
                                           $"Update to version {vuln.FixedInVersion} or later", 
                                           "Update to latest secure version"),
                    .AutoFixable = True
                })
            Next

            ' Critical outdated dependencies
            For Each outdated In dependencyResult.OutdatedDependencies.Where(Function(o) o.UpdateType = "major")
                issues.Add(New QualityIssue With {
                    .Severity = IssueSeverity.Medium,
                    .Category = IssueCategory.Dependencies,
                    .Title = $"Major Version Update Available: {outdated.Name}",
                    .Description = $"{outdated.Name} can be updated from {outdated.CurrentVersion} to {outdated.LatestVersion}",
                    .Source = Name,
                    .RecommendedAction = "Review changelog and update dependency",
                    .AutoFixable = False
                })
            Next

            Return issues
        End Function

    End Class

End Namespace