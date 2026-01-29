export class MisconfigurationDetector {
  detectIssues(systemInfo) {
    const issues = [];

    issues.push(...this.detectCPUIssues(systemInfo.cpu));
    issues.push(...this.detectMemoryIssues(systemInfo.memory));
    issues.push(...this.detectGraphicsIssues(systemInfo.graphics));
    issues.push(...this.detectStorageIssues(systemInfo.storage));
    issues.push(...this.detectOSIssues(systemInfo.os));

    return issues;
  }

  detectCPUIssues(cpu) {
    const issues = [];

    if (cpu.speed < 2.0) {
      issues.push({
        severity: 'warning',
        category: 'CPU',
        issue: 'Low clock speed',
        description: `CPU speed is ${cpu.speed}GHz, which may be insufficient for modern applications`,
        recommendation: 'Consider upgrading to a CPU with higher clock speed for better performance'
      });
    }

    if (cpu.cores < 4) {
      issues.push({
        severity: 'warning',
        category: 'CPU',
        issue: 'Limited core count',
        description: `Only ${cpu.cores} cores detected, multitasking may be limited`,
        recommendation: 'For better multitasking, consider a CPU with at least 4-6 cores'
      });
    }

    if (!cpu.virtualization) {
      issues.push({
        severity: 'info',
        category: 'CPU',
        issue: 'Virtualization disabled',
        description: 'CPU virtualization is not enabled in BIOS/UEFI',
        recommendation: 'Enable virtualization in BIOS settings for virtual machines and containers'
      });
    }

    return issues;
  }

  detectMemoryIssues(memory) {
    const issues = [];
    const totalGB = Math.round(memory.total / (1024 * 1024 * 1024));
    const usagePercent = ((memory.used / memory.total) * 100).toFixed(1);

    if (totalGB < 8) {
      issues.push({
        severity: 'critical',
        category: 'Memory',
        issue: 'Insufficient RAM',
        description: `Only ${totalGB}GB RAM detected, below modern requirements`,
        recommendation: 'Upgrade to at least 16GB RAM for better performance'
      });
    } else if (totalGB < 16) {
      issues.push({
        severity: 'warning',
        category: 'Memory',
        issue: 'Limited RAM',
        description: `${totalGB}GB RAM may be insufficient for heavy workloads`,
        recommendation: 'Consider upgrading to 16GB or more for gaming or content creation'
      });
    }

    if (usagePercent > 90) {
      issues.push({
        severity: 'critical',
        category: 'Memory',
        issue: 'High memory usage',
        description: `${usagePercent}% of RAM is currently in use`,
        recommendation: 'Close unnecessary applications or upgrade RAM'
      });
    } else if (usagePercent > 75) {
      issues.push({
        severity: 'warning',
        category: 'Memory',
        issue: 'Elevated memory usage',
        description: `${usagePercent}% of RAM is currently in use`,
        recommendation: 'Monitor memory usage and consider closing unused applications'
      });
    }

    return issues;
  }

  detectGraphicsIssues(graphics) {
    const issues = [];

    if (graphics.controllers.length === 0) {
      issues.push({
        severity: 'critical',
        category: 'Graphics',
        issue: 'No GPU detected',
        description: 'No graphics controller found',
        recommendation: 'Install or check graphics card drivers'
      });
    }

    graphics.controllers.forEach((gpu, index) => {
      if (!gpu.vram || gpu.vram < 2048) {
        issues.push({
          severity: 'warning',
          category: 'Graphics',
          issue: 'Low VRAM',
          description: `GPU ${index + 1} has only ${gpu.vram || 'unknown'}MB VRAM`,
          recommendation: 'Consider upgrading GPU with at least 4GB VRAM for modern applications'
        });
      }

      if (!gpu.driverVersion) {
        issues.push({
          severity: 'warning',
          category: 'Graphics',
          issue: 'Missing GPU driver',
          description: `No driver version detected for GPU ${index + 1}`,
          recommendation: 'Install latest graphics drivers from manufacturer'
        });
      }
    });

    return issues;
  }

  detectStorageIssues(storage) {
    const issues = [];

    if (storage.disks.length === 0) {
      issues.push({
        severity: 'critical',
        category: 'Storage',
        issue: 'No storage devices found',
        description: 'No disk drives detected',
        recommendation: 'Check storage connections and BIOS settings'
      });
    }

    storage.disks.forEach((disk, index) => {
      const sizeGB = Math.round(disk.size / (1024 * 1024 * 1024));
      
      if (disk.type === 'HDD') {
        issues.push({
          severity: 'warning',
          category: 'Storage',
          issue: 'Using traditional HDD',
          description: `Disk ${disk.device} is an HDD, slower than SSD`,
          recommendation: 'Consider upgrading to SSD for better performance'
        });
      }

      if (sizeGB < 256 && disk.type === 'SSD') {
        issues.push({
          severity: 'warning',
          category: 'Storage',
          issue: 'Small SSD capacity',
          description: `SSD ${disk.device} is only ${sizeGB}GB`,
          recommendation: 'Consider larger SSD (500GB+) for adequate storage'
        });
      }
    });

    return issues;
  }

  detectOSIssues(os) {
    const issues = [];

    if (os.platform === 'win32') {
      const version = parseInt(os.release);
      if (version < 10) {
        issues.push({
          severity: 'critical',
          category: 'OS',
          issue: 'Outdated Windows version',
          description: `Windows version ${os.release} is no longer supported`,
          recommendation: 'Upgrade to Windows 10 or 11 for security and performance'
        });
      }
    }

    if (os.arch === 'ia32') {
      issues.push({
        severity: 'info',
        category: 'OS',
        issue: '32-bit architecture',
        description: 'Running 32-bit OS limits memory usage',
        recommendation: 'Consider upgrading to 64-bit OS for better performance'
      });
    }

    return issues;
  }
}