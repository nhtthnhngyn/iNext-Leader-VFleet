// Demo data generation for V-Fleet Logistics

const RIDER_NAMES = [
  'Nguyễn Văn An', 'Trần Thị Bích', 'Lê Minh Cường', 'Phạm Thị Dung', 'Hoàng Văn Em',
  'Vũ Thị Phương', 'Đặng Văn Giang', 'Bùi Thị Hoa', 'Đỗ Văn Inh', 'Ngô Thị Kim',
  'Đinh Văn Long', 'Lý Thị Mai', 'Phan Văn Nam', 'Trịnh Thị Oanh', 'Tô Văn Phú',
  'Cao Thị Quyên', 'Hồ Văn Rồng', 'Dương Thị Sen', 'Lưu Văn Tài', 'Mạc Thị Uyên',
  'Nghiêm Văn Việt', 'Nông Thị Xuân', 'Sầm Văn Yên', 'Thạch Thị Zin', 'Kiều Văn Anh',
  'Tạ Thị Bảo', 'Hà Văn Chiến', 'Trương Thị Dịu', 'Văn Minh Đức', 'Quách Thị Én',
  'Liêu Văn Phong', 'Giang Thị Giỏi', 'Khổng Văn Hào', 'Lôi Thị Hiên', 'Mã Văn Ích',
  'Nhan Thị Kim', 'Ông Văn Lộc', 'Phó Thị Mỹ', 'Quan Văn Nghĩa', 'Sử Thị Nhung',
  'Tăng Văn Ổn', 'Thái Thị Phúc', 'Vương Văn Quang', 'Âu Thị Rạng', 'Bành Văn Sơn',
  'Cái Thị Thanh', 'Chiêm Văn Uy', 'Đàm Thị Vân', 'Giao Văn Ý', 'Hạng Thị Ánh',
  'Hứa Văn Bình', 'Kha Thị Cẩm', 'Lạc Văn Đào', 'Mao Thị Emm', 'Ngải Văn Phát',
  'Nhuệ Thị Gái', 'Ổn Văn Hùng', 'Phù Thị Ích', 'Quay Văn Khỏe', 'Rừng Thị Lan',
  'Sơn Văn Mạnh', 'Tây Thị Nga', 'Ước Văn Oanh', 'Vui Thị Phong', 'Yêu Văn Quý',
  'Zen Thị Ren', 'An Văn Sáng', 'Bông Thị Tâm', 'Cảnh Văn Uyên', 'Đẹp Thị Vân',
  'Em Văn Xuân', 'Giỏi Thị Yến', 'Hoa Văn Zác', 'Ích Thị Ân', 'Kim Văn Bảo',
  'Lành Thị Chiêu', 'Mạnh Văn Dũng', 'Ngoan Thị Em', 'Ổn Văn Phúc', 'Phú Thị Giang',
  'Quý Văn Hải', 'Rồng Thị Ích', 'Sáng Văn Kim', 'Tốt Thị Lân', 'Ước Văn Mai',
  'Vạn Thị Nam', 'Yêu Văn Oa', 'Zác Thị Phong', 'Ân Văn Quân', 'Bảo Thị Rồng',
  'Chiêu Văn Sơn', 'Dũng Thị Tâm', 'Em Văn Uyên', 'Phúc Thị Việt', 'Giang Văn Xuân'
];

const PHONE_PREFIXES = ['090', '091', '094', '096', '097', '098', '032', '033', '034', '035'];

function randomPhone() {
  const prefix = PHONE_PREFIXES[Math.floor(Math.random() * PHONE_PREFIXES.length)];
  const suffix = Math.floor(Math.random() * 9000000 + 1000000).toString();
  return `${prefix} ${suffix.slice(0,3)} ${suffix.slice(3)}`;
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

function hoursAgo(h) {
  const d = new Date();
  d.setHours(d.getHours() - h);
  return d.toISOString();
}

// Check if current time is within charging window (21:30 - 07:00)
function isChargingHour(date = new Date()) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  const chargingStart = 21 * 60 + 30; // 21:30
  const chargingEnd = 7 * 60; // 07:00
  
  return timeInMinutes >= chargingStart || timeInMinutes < chargingEnd;
}

// Check if current time is within working hours (08:00 - 21:00)
function isWorkingHour(date = new Date()) {
  const hours = date.getHours();
  return hours >= 8 && hours < 21;
}

function generateBatteries() {
  const batteries = [];
  const chargerTypes = ['Normal', 'Fast', 'None'];
  const batteryTypes = ['NMC', 'LFP'];
  const now = new Date();
  const isChargingWindow = isChargingHour(now);

  // Target: 35-45 batteries charging with mix (more normal than fast)
  // To hit 35-45 kW with Normal (0.8kW) and Fast (1.8kW):
  // Example: 30 Normal (24 kW) + 10 Fast (18 kW) = 40 batteries, 42 kW
  // Example: 35 Normal (28 kW) + 8 Fast (14.4 kW) = 43 batteries, 42.4 kW
  const targetTotalBatteries = randomInt(35, 45); // 35-45 total
  const fastRatio = randomBetween(0.20, 0.30); // 20-30% fast chargers
  const targetFastCount = Math.round(targetTotalBatteries * fastRatio);
  const targetNormalCount = targetTotalBatteries - targetFastCount;

  let chargingCount = 0;
  let normalCount = 0;
  let fastCount = 0;

  for (let i = 1; i <= 150; i++) {
    const id = `BAT-${String(i).padStart(3, '0')}`;
    const isActive = i <= 100;
    const isSpare = i > 100;

    let status, soc, temp, chargingStatus, chargerType, statusTag;

    // Force some specific states per spec
    if (i === 5 || i === 23 || i === 67) {
      // Isolated - overheating
      soc = randomInt(30, 60);
      temp = randomInt(51, 65);
      chargingStatus = 'Isolated';
      chargerType = 'None';
      statusTag = 'Isolated';
    } else if (i === 12 || i === 89) {
      // Fault
      soc = randomInt(10, 40);
      temp = randomInt(40, 52);
      chargingStatus = 'Fault';
      chargerType = 'None';
      statusTag = 'Blocked';
    } else if (isSpare) {
      soc = randomInt(75, 100);
      temp = randomInt(25, 35);
      chargingStatus = 'Idle';
      chargerType = 'None';
      statusTag = 'Normal';
    } else {
      soc = randomInt(15, 95);
      temp = randomInt(28, 52);
      // amber temp zone for a few
      if (i >= 30 && i <= 34) temp = randomInt(45, 50);
      
      // Only allow charging during charging window and within target count
      if (isChargingWindow && chargingCount < targetTotalBatteries) {
        chargingStatus = 'Charging';
        
        // Prioritize normal chargers first (70-80% normal, 20-30% fast)
        if (normalCount < targetNormalCount) {
          chargerType = 'Normal';
          normalCount++;
        } else if (fastCount < targetFastCount) {
          chargerType = 'Fast';
          fastCount++;
        } else {
          chargerType = 'Normal';
          normalCount++;
        }
        chargingCount++;
      } else {
        chargingStatus = 'In Use';
        chargerType = 'None';
      }

      if (temp > 50) {
        chargingStatus = 'Isolated';
        chargerType = 'None';
        statusTag = 'Isolated';
      } else if (soc < 20) {
        statusTag = 'Warning';
      } else {
        statusTag = 'Normal';
      }
    }

    const cycleCount = randomInt(50, 650);
    const soh = Math.max(70, 100 - cycleCount * 0.04 - randomBetween(0, 5));
    const batteryType = batteryTypes[randomInt(0, 1)];
    const fastChargeCount = randomInt(0, 6);
    const vehicleId = isActive ? `VH-${String(i).padStart(3, '0')}` : null;

    // Fast charge finish time - only valid during charging window
    let finishTime = null;
    if (chargingStatus === 'Charging' && isChargingWindow) {
      const remainingKwh = ((100 - soc) / 100) * 1.8;
      const rate = chargerType === 'Fast' ? 1.8 : 0.8;
      const hoursLeft = remainingKwh / rate;
      const finish = new Date();
      finish.setTime(finish.getTime() + hoursLeft * 3600000);
      finishTime = finish.toISOString();
    }

    batteries.push({
      id,
      vehicleId,
      soc: Math.round(soc),
      temp: Math.round(temp * 10) / 10,
      chargingStatus,
      chargerType,
      statusTag: statusTag || (soc < 20 ? 'Warning' : 'Normal'),
      cycleCount,
      soh: Math.round(soh * 10) / 10,
      batteryType,
      fastChargeCount,
      lastFastCharge: fastChargeCount > 0 ? hoursAgo(randomInt(2, 72)) : null,
      finishTime,
      isSpare,
      plugInSoc: chargingStatus === 'Charging' ? randomInt(10, 35) : null,
      slotId: chargingStatus === 'Charging' ? `SLOT-${String(randomInt(1, 50)).padStart(2, '0')}` : null,
    });
  }
  return batteries;
}

function generateVehicles(batteries) {
  const vehicles = [];
  const now = new Date();
  const working = isWorkingHour(now);
  const charging = isChargingHour(now);

  const highMileageIndices = new Set();
  while (highMileageIndices.size < 30) {
    highMileageIndices.add(randomInt(1, 100));
  }

  for (let i = 1; i <= 100; i++) {
    const id = `VH-${String(i).padStart(3, '0')}`;
    const batteryId = `BAT-${String(i).padStart(3, '0')}`;
    const battery = batteries.find(b => b.id === batteryId);
    const isHighMileage = highMileageIndices.has(i);
    
    // Location and field status based on working hours
    let location, inField;
    if (working) {
      // Working hours (8h-21h): 90-100 should be in field
      inField = randomInt(1, 10) <= 9; // 90% in field
      location = inField ? 'In Field' : 'At Warehouse';
    } else if (charging) {
      // Charging hours (21h30-7h): 0-10 in field, most at warehouse
      inField = randomInt(1, 10) === 1; // 10% in field
      location = inField ? 'In Field' : 'At Warehouse';
    } else {
      // Transition hours: mostly at warehouse
      location = 'At Warehouse';
    }

    const shiftEnd = new Date();
    shiftEnd.setHours(21, 0, 0, 0);
    const hoursRemaining = Math.max(0, (shiftEnd - now) / 3600000);

    const swapRecommended = isHighMileage && battery && battery.soc < 40 && hoursRemaining > 3;

    const returnETA = new Date();
    returnETA.setHours(20, randomInt(30, 59), 0, 0);

    vehicles.push({
      id,
      riderName: RIDER_NAMES[i - 1],
      riderId: `RID-${String(i).padStart(3, '0')}`,
      phone: randomPhone(),
      riderType: isHighMileage ? 'High-Mileage' : 'Standard',
      batteryId,
      soc: battery?.soc ?? 0,
      location,
      returnETA: returnETA.toISOString(),
      status: 'Active',
      swapRecommended,
      hoursRemaining: Math.round(hoursRemaining * 10) / 10,
      dailyKm: isHighMileage ? randomInt(95, 125) : randomInt(40, 85),
      messages: [],
      notes: '',
    });
  }
  return vehicles;
}

const INCIDENT_TYPES = [
  'Low Battery Mid-Shift',
  'Missed Overnight Charging',
  'Wrong Battery Assigned',
  'Battery Overheating',
  'Charger Stopped',
  'Physical Damage',
  'Other'
];

const INCIDENT_DISTRIBUTION = [
  { type: 'Low Battery Mid-Shift', count: 6 },
  { type: 'Missed Overnight Charging', count: 7 },
  { type: 'Wrong Battery Assigned', count: 5 },
  { type: 'Battery Overheating', count: 4 },
  { type: 'Charger Stopped', count: 3 },
];

const SEVERITIES = ['Low', 'Medium', 'High'];
const RESOLUTIONS = ['Open', 'In Progress', 'Resolved'];
const AUTO_TAGS = { 'Battery Overheating': 'Safety', 'Charger Stopped': 'Operational', 'Wrong Battery Assigned': 'Compliance', 'Low Battery Mid-Shift': 'Safety', 'Missed Overnight Charging': 'Compliance', 'Physical Damage': 'Safety', 'Other': 'Operational' };

function generateIncidents(vehicles) {
  const incidents = [];
  let incId = 1;

  const descriptions = {
    'Low Battery Mid-Shift': ['Battery dropped below 15% at 14:30, forced early return', 'Rider reported SoC <10% at 13:00, unable to complete last delivery run', 'Mid-route battery depletion, required emergency swap'],
    'Missed Overnight Charging': ['Bike returned but not plugged in, found uncharged at 06:00', 'Rider forgot to connect charger, battery at 8% at shift start', 'Charger connector not seated properly, charging did not initiate'],
    'Wrong Battery Assigned': ['BAT-045 assigned to VH-072 by mistake, mismatch flagged at startup', 'Battery swap at field point used wrong unit, cycle count mismatch detected', 'Rider took spare battery not assigned to their vehicle'],
    'Battery Overheating': ['Temperature reached 58°C during fast charging, auto-isolated', 'Cell temp spiked to 61°C in direct sunlight during field use', 'Fast charge cycle triggered thermal warning at 52°C'],
    'Charger Stopped': ['SLOT-12 charger unit lost power mid-cycle', 'Charger display error E04, ceased operation at 02:30', 'Normal charger failed to initiate, battery left uncharged'],
  };

  const now = new Date();

  INCIDENT_DISTRIBUTION.forEach(({ type, count }) => {
    for (let j = 0; j < count; j++) {
      const vehicle = vehicles[randomInt(0, vehicles.length - 1)];
      const daysAgo = randomInt(0, 30);
      const incidentTime = new Date(now);
      incidentTime.setDate(incidentTime.getDate() - daysAgo);
      incidentTime.setHours(randomInt(6, 21), randomInt(0, 59));

      const descArr = descriptions[type] || ['Incident reported by rider'];
      const resolution = RESOLUTIONS[randomInt(0, 2)];

      incidents.push({
        id: `INC-${String(incId).padStart(3, '0')}`,
        type,
        vehicleId: vehicle.id,
        batteryId: vehicle.batteryId,
        riderId: vehicle.riderId,
        riderName: vehicle.riderName,
        time: incidentTime.toISOString(),
        description: descArr[randomInt(0, descArr.length - 1)],
        severity: type === 'Battery Overheating' ? 'High' : type === 'Low Battery Mid-Shift' ? 'Medium' : SEVERITIES[randomInt(0, 2)],
        tag: AUTO_TAGS[type] || 'Operational',
        resolution,
        resolutionNote: resolution === 'Resolved' ? 'Issue addressed and documented. Rider briefed.' : '',
        autoDetected: type === 'Battery Overheating' || type === 'Charger Stopped',
      });
      incId++;
    }
  });

  // Add a few more random incidents
  for (let k = 0; k < 3; k++) {
    const type = INCIDENT_TYPES[randomInt(0, 4)];
    const vehicle = vehicles[randomInt(0, vehicles.length - 1)];
    const daysAgo = randomInt(0, 14);
    const incidentTime = new Date(now);
    incidentTime.setDate(incidentTime.getDate() - daysAgo);
    incidentTime.setHours(randomInt(6, 21), randomInt(0, 59));

    incidents.push({
      id: `INC-${String(incId).padStart(3, '0')}`,
      type,
      vehicleId: vehicle.id,
      batteryId: vehicle.batteryId,
      riderId: vehicle.riderId,
      riderName: vehicle.riderName,
      time: incidentTime.toISOString(),
      description: 'Reported by rider via app.',
      severity: SEVERITIES[randomInt(0, 2)],
      tag: AUTO_TAGS[type] || 'Operational',
      resolution: RESOLUTIONS[randomInt(0, 2)],
      resolutionNote: '',
      autoDetected: false,
    });
    incId++;
  }

  return incidents.sort((a, b) => new Date(b.time) - new Date(a.time));
}

function generateChargingSlots(batteries) {
  const slots = [];
  const chargingBatteries = batteries.filter(b => b.chargingStatus === 'Charging');

  for (let i = 1; i <= 50; i++) {
    const slotId = `SLOT-${String(i).padStart(2, '0')}`;
    const battery = chargingBatteries[i - 1];

    if (battery) {
      slots.push({
        id: slotId,
        batteryId: battery.id,
        chargerType: battery.chargerType,
        plugInSoc: battery.plugInSoc,
        currentSoc: battery.soc,
        finishTime: battery.finishTime,
        status: battery.chargingStatus === 'Fault' ? 'fault' : 'charging',
      });
    } else {
      slots.push({
        id: slotId,
        batteryId: null,
        chargerType: null,
        plugInSoc: null,
        currentSoc: null,
        finishTime: null,
        status: 'empty',
      });
    }
  }
  return slots;
}

export function generateInitialData() {
  const batteries = generateBatteries();
  const vehicles = generateVehicles(batteries);
  const incidents = generateIncidents(vehicles);
  const chargingSlots = generateChargingSlots(batteries);

  // Calculate initial power load - target 35-45 kW
  const chargingBatteries = batteries.filter(b => b.chargingStatus === 'Charging');
  const normalCount = chargingBatteries.filter(b => b.chargerType === 'Normal').length;
  const fastCount = chargingBatteries.filter(b => b.chargerType === 'Fast').length;
  
  // Power calculation: 0.8 kW per Normal + 1.8 kW per Fast
  let powerLoad = normalCount * 0.8 + fastCount * 1.8;
  powerLoad = Math.round(powerLoad * 10) / 10;

  return {
    batteries,
    vehicles,
    incidents,
    chargingSlots,
    powerLoad,
    normalChargerCount: normalCount,
    fastChargerCount: fastCount,
    toasts: [],
    toastId: 0,
  };
}

export { INCIDENT_TYPES, SEVERITIES, AUTO_TAGS };
