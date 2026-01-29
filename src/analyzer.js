import si from 'systeminformation';

export async function analyzeSystem() {
  console.log('Collecting system information...');
  
  const [cpu, mem, graphics, diskLayout, osInfo] = await Promise.all([
    si.cpu(),
    si.mem(),
    si.graphics(),
    si.diskLayout(),
    si.osInfo()
  ]);

  return {
    cpu: {
      manufacturer: cpu.manufacturer,
      brand: cpu.brand,
      speed: cpu.speed,
      cores: cpu.cores,
      physicalCores: cpu.physicalCores,
      virtualization: cpu.virtualization
    },
    memory: {
      total: mem.total,
      available: mem.available,
      used: mem.used,
      free: mem.free
    },
    graphics: {
      controllers: graphics.controllers.map(gpu => ({
        vendor: gpu.vendor,
        model: gpu.model,
        vram: gpu.vram,
        driverVersion: gpu.driverVersion
      }))
    },
    storage: {
      disks: diskLayout.map(disk => ({
        device: disk.device,
        type: disk.type,
        size: disk.size,
        interfaceType: disk.interfaceType
      }))
    },
    os: {
      platform: osInfo.platform,
          distro: osInfo.distro,
      release: osInfo.release,
      arch: osInfo.arch
    }
  };
}