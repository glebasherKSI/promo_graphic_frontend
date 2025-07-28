// public/event.worker.js

import * as comlink from 'comlink';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import isBetween from 'dayjs/plugin/isBetween';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(utc);
dayjs.extend(isBetween);
dayjs.extend(customParseFormat);

const eventWorker = {
  processEvents(events, selectedMonth, selectedYear) {
    const processedEvents = [];
    const startDate = dayjs.utc(`${selectedYear}-${selectedMonth + 1}-01`).startOf('month');
    const endDate = startDate.endOf('month');

    events.forEach(event => {
      if (!event.recurring || !event.recurring_settings) {
        processedEvents.push(event);
        return;
      }

      const { frequency, interval, end_date: recurringEndDateStr } = event.recurring_settings;
      const recurringEndDate = recurringEndDateStr ? dayjs.utc(recurringEndDateStr) : endDate;

      let currentDate = dayjs.utc(event.start_date);
      const originalDuration = dayjs.utc(event.end_date).diff(currentDate, 'day');

      while (currentDate.isBefore(recurringEndDate) || currentDate.isSame(recurringEndDate)) {
        if (currentDate.isAfter(endDate)) {
          break;
        }

        const newStartDate = currentDate;
        const newEndDate = newStartDate.add(originalDuration, 'day');

        if (newStartDate.isBefore(endDate) && newEndDate.isAfter(startDate)) {
          processedEvents.push({
            ...event,
            id: `${event.id}-recurring-${currentDate.valueOf()}`,
            start_date: newStartDate.toISOString(),
            end_date: newEndDate.toISOString(),
            is_recurring_instance: true,
          });
        }
        
        if (frequency === 'daily') {
          currentDate = currentDate.add(interval, 'day');
        } else if (frequency === 'weekly') {
          currentDate = currentDate.add(interval, 'week');
        } else if (frequency === 'monthly') {
          currentDate = currentDate.add(interval, 'month');
        } else {
          break;
        }
      }
    });

    return processedEvents;
  }
};

comlink.expose(eventWorker); 