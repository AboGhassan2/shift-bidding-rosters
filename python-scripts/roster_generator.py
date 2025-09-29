#!/usr/bin/env python3
import sys
import json
from datetime import datetime, timedelta

def get_month_dates(year, month):
    """Get all dates for the specified month"""
    first_day = datetime(year, month, 1)
    if month == 12:
        last_day = datetime(year + 1, 1, 1) - timedelta(days=1)
    else:
        last_day = datetime(year, month + 1, 1) - timedelta(days=1)
    
    dates = []
    current_date = first_day
    while current_date <= last_day:
        dates.append(current_date)
        current_date += timedelta(days=1)
    
    return dates

def generate_shift_pattern(line_number, dates):
    """Generate shift pattern for a line number"""
    shifts = ['A', 'B', 'C']
    base_cycle = []
    
    # Build cycle: 5 work days + 2 OFF days for each shift
    for shift_idx in range(3):
        current_shift = shifts[(line_number + shift_idx) % 3]
        base_cycle.extend([current_shift] * 5)
        base_cycle.extend(['OFF'] * 2)
    
    # Apply offset based on line number
    cycle_offset = line_number % len(base_cycle)
    offset_cycle = base_cycle[cycle_offset:] + base_cycle[:cycle_offset]
    
    # Generate pattern for entire month
    pattern = []
    for day_idx in range(len(dates)):
        cycle_pos = day_idx % len(offset_cycle)
        pattern.append(offset_cycle[cycle_pos])
    
    return pattern

def generate_roster_lines(total_lines, year, month):
    """Generate roster lines for the month"""
    lines = []
    month_dates = get_month_dates(year, month)
    
    for line_number in range(1, total_lines + 1):
        pattern = generate_shift_pattern(line_number, month_dates)
        
        for date, shift in zip(month_dates, pattern):
            # Only include work shifts (A, B, C) for bidding
            if shift in ['A', 'B', 'C']:
                lines.append({
                    'lineNumber': line_number,
                    'date': date.isoformat(),
                    'shift': shift,
                    'department': 'General'
                })
    
    return lines

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(json.dumps({"error": "Missing arguments: year month totalLines"}))
        sys.exit(1)
    
    try:
        year = int(sys.argv[1])
        month = int(sys.argv[2])
        total_lines = int(sys.argv[3])
        
        roster_lines = generate_roster_lines(total_lines, year, month)
        print(json.dumps(roster_lines))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
