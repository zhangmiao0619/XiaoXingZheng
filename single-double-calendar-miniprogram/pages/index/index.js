const { getHolidayInfo } = require('../../utils/holiday.js');

Page({
  data: {
    // 当前年月
    currentYear: 2026,
    currentMonthIndex: 3, // 0-11, 默认4月
    // 用户设置
    startDate: '2026-01-05',
    startType: 'single',     // 'double' 或 'single'
    singleWorkDay: 'saturday', // 'saturday' 或 'sunday'
    // 界面
    showSettings: false,
    yearList: [2024, 2025, 2026, 2027, 2028, 2029, 2030],
    monthNames: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    monthsData: [],
    swiperCurrent: 0,
    swiperHeight: 600,
    // 多列选择器
    multiRange: [[], []],
    multiValue: [0, 0],
    viewMode: 'single'
  },
  // 切换视图
  switchToSingle() {
    if (this.data.viewMode === 'single') return;
    this.setData({ viewMode: 'single' });
    // 重新计算当前月份卡片高度
    setTimeout(() => this.updateSwiperHeight(this.data.swiperCurrent), 200);
  },
  switchToYear() {
    if (this.data.viewMode === 'year') return;
    this.setData({ viewMode: 'year' });
  },

  onLoad() {
    this.loadUserSettings();
    this.initMultiRange();
    // 根据起始日期初始化当前年月
    this.initYearMonthFromStartDate();
    this.generateAllMonthsData();
    this.initSwiper();
  },

  // 初始化多列选择器的数据
  initMultiRange() {
    const years = this.data.yearList;
    const months = this.data.monthNames;
    this.setData({
      multiRange: [years, months],
      multiValue: [years.indexOf(this.data.currentYear), this.data.currentMonthIndex]
    });
  },

  // 从起始日期初始化当前年月（使日历显示起始周所在的月份）
  initYearMonthFromStartDate() {
    const { startDate } = this.data;
    if (startDate) {
      const parts = startDate.split('-');
      if (parts.length >= 2) {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        if (year >= 2024 && year <= 2030) {
          this.setData({ currentYear: year, currentMonthIndex: month });
          this.updateMultiValue();
        }
      }
    }
  },

  // 更新多列选择器的值
  updateMultiValue() {
    const yearIdx = this.data.yearList.indexOf(this.data.currentYear);
    this.setData({
      multiValue: [yearIdx, this.data.currentMonthIndex]
    });
  },

  // 生成所有月份数据（基于当前年份）
  generateAllMonthsData() {
    const { currentYear, startDate, startType, singleWorkDay } = this.data;
    const monthsData = [];
    for (let m = 1; m <= 12; m++) {
      monthsData.push(this.generateMonth(currentYear, m, startDate, startType, singleWorkDay));
    }
    this.setData({ monthsData });
  },

  // 生成单个月份
  generateMonth(year, month, startDate, startType, singleWorkDay) {
    const firstDay = new Date(year, month - 1, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const startOffset = startWeekday === 0 ? 6 : startWeekday - 1;
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
    const days = [];
    let dayCounter = 1;
    for (let i = 0; i < totalCells; i++) {
      if (i < startOffset || dayCounter > daysInMonth) {
        days.push({ isEmpty: true });
      } else {
        const date = new Date(year, month - 1, dayCounter);
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayCounter).padStart(2, '0')}`;
        const holiday = getHolidayInfo(dateStr);
        const baseWorkStatus = this.getBaseWorkStatus(date, startDate, startType, singleWorkDay);
        const final = this.getFinalStatus(date, baseWorkStatus, holiday);
        days.push({
          isEmpty: false,
          day: dayCounter,
          text: final.text,
          cls: final.cls
        });
        dayCounter++;
      }
    }
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    return { name: monthNames[month - 1], days };
  },

  // 基础单双休状态
  getBaseWorkStatus(date, startWeekDate, startType, singleWorkDay) {
    const dayOfWeek = date.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) return true;
    const currentDate = new Date(date);
    const currentDayOfWeek = currentDate.getDay();
    const monday = new Date(currentDate);
    const diffToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
    monday.setDate(currentDate.getDate() - diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const startBase = new Date(startWeekDate);
    startBase.setHours(0, 0, 0, 0);
    const startDayOfWeek = startBase.getDay();
    const startMonday = new Date(startBase);
    const startDiff = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    startMonday.setDate(startBase.getDate() - startDiff);
    startMonday.setHours(0, 0, 0, 0);
    const weekDiff = Math.round((monday - startMonday) / (7 * 86400000));
    let isDoubleWeek = (startType === 'double');
    if (weekDiff % 2 !== 0) isDoubleWeek = !isDoubleWeek;
    if (isDoubleWeek) return false;
    if (singleWorkDay === 'saturday') return dayOfWeek === 6;
    return dayOfWeek === 0;
  },

  // 最终状态（节假日优先）
  getFinalStatus(date, baseWorkStatus, holiday) {
    if (holiday) {
      if (holiday.type === 'holiday') return { work: false, text: holiday.name, cls: 'holiday' };
      if (holiday.type === 'workday') return { work: true, text: holiday.name, cls: 'workday' };
    }
    if (baseWorkStatus) {
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 6 || dayOfWeek === 0) return { work: true, text: '班', cls: 'single' };
      return { work: true, text: '工作日', cls: '' };
    }
    return { work: false, text: '休', cls: 'double' };
  },

  // 初始化轮播位置
  initSwiper() {
    const idx = this.data.currentMonthIndex;
    this.setData({ swiperCurrent: idx });
    setTimeout(() => this.updateSwiperHeight(idx), 200);
  },

  updateSwiperHeight(monthIndex) {
    const query = wx.createSelectorQuery();
    query.select(`#month-card-${monthIndex}`).boundingClientRect();
    query.exec((res) => {
      if (res && res[0] && res[0].height) {
        this.setData({ swiperHeight: res[0].height + 30 });
      } else {
        this.setData({ swiperHeight: 650 });
      }
    });
  },

  // 多列选择器确认事件
  onYearMonthChange(e) {
    const val = e.detail.value;
    const newYear = this.data.multiRange[0][val[0]];
    const newMonthIndex = val[1];
    if (newYear === this.data.currentYear && newMonthIndex === this.data.currentMonthIndex) return;
    this.setData({
      currentYear: newYear,
      currentMonthIndex: newMonthIndex,
      swiperCurrent: newMonthIndex
    });
    this.generateAllMonthsData();
    this.updateSwiperHeight(newMonthIndex);
    this.autoSaveSettings();
  },

  // 左右滑动切换月份（支持跨年）
  onSwiperChange(e) {
    const newIndex = e.detail.current;
    const oldIndex = this.data.swiperCurrent;
    if (newIndex === oldIndex) return;

    let newYear = this.data.currentYear;
    let newMonthIndex = newIndex;

    // 跨年逻辑
    if (newIndex === 0 && oldIndex === 11) {
      newYear = this.data.currentYear + 1;
      newMonthIndex = 0;
    } else if (newIndex === 11 && oldIndex === 0) {
      newYear = this.data.currentYear - 1;
      newMonthIndex = 11;
    }

    if (newYear !== this.data.currentYear) {
      // 年份变化
      this.setData({
        currentYear: newYear,
        currentMonthIndex: newMonthIndex,
        swiperCurrent: newMonthIndex
      });
      this.generateAllMonthsData();
      this.updateSwiperHeight(newMonthIndex);
      this.updateMultiValue();
      this.autoSaveSettings();
    } else {
      // 同一年内
      this.setData({
        swiperCurrent: newIndex,
        currentMonthIndex: newIndex
      });
      this.updateSwiperHeight(newIndex);
      this.updateMultiValue();
    }
  },

  // 折叠设置面板
  toggleSettings() {
    this.setData({ showSettings: !this.data.showSettings });
  },

  // 设置变更
  onStartDateChange(e) {
    this.setData({ startDate: e.detail.value });
    this.generateAllMonthsData();
    this.autoSaveSettings();
  },

  onStartTypeChange(e) {
    this.setData({ startType: e.detail.value });
    this.generateAllMonthsData();
    this.autoSaveSettings();
  },

  onSingleWorkDayChange(e) {
    this.setData({ singleWorkDay: e.detail.value });
    this.generateAllMonthsData();
    this.autoSaveSettings();
  },

  // 自动保存设置
  autoSaveSettings() {
    const { startDate, startType, singleWorkDay, currentYear, currentMonthIndex } = this.data;
    wx.setStorageSync('singleDoubleCalendarSettings', {
      startDate, startType, singleWorkDay,
      currentYear, currentMonthIndex
    });
  },

  loadUserSettings() {
    const settings = wx.getStorageSync('singleDoubleCalendarSettings');
    if (settings) {
      this.setData({
        startDate: settings.startDate || '2026-01-05',
        startType: settings.startType || 'single',
        singleWorkDay: settings.singleWorkDay || 'saturday',
        currentYear: settings.currentYear || 2026,
        currentMonthIndex: settings.currentMonthIndex || 3
      });
    }
  }
});