import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import os
from collections import defaultdict
from pathlib import Path


class ShiftRosterGenerator:
    def __init__(self, excel_file_path, total_employees=2500):
        self.excel_file_path = excel_file_path
        self.total_employees = total_employees
        self.vacation_percentage = 0.1
        self.shifts = {
            'A': {'name': 'Morning', 'start': '07:00', 'end': '15:00'},
            'B': {'name': 'Evening', 'start': '15:00', 'end': '23:00'},
            'C': {'name': 'Night', 'start': '23:00', 'end': '07:00'}
        }
        self.shift_sequence = ['A', 'B', 'C', 'OFF']
        self.min_consecutive_work_days = 5
        self.max_consecutive_work_days = 5
        self.standby_per_shift = 12

    def load_employee_data(self):
        try:
            file_extensions = ['.xlsx', '.xls', '.csv']
            file_loaded = False

            for ext in file_extensions:
                full_path = self.excel_file_path + ext
                if os.path.exists(full_path):
                    print(f"Loading file: {full_path}")
                    if ext == '.csv':
                        self.employees_df = pd.read_csv(full_path)
                    else:
                        try:
                            self.employees_df = pd.read_excel(full_path)
                        except:
                            self.employees_df = pd.read_excel(full_path, sheet_name=0)

                    self.employees_df = self.employees_df.dropna(how='all')
                    self.employees_df = self.employees_df.loc[:, ~self.employees_df.columns.str.contains('^Unnamed')]
                    file_loaded = True
                    break

            if not file_loaded:
                print(f"Excel file not found at {self.excel_file_path}")
                print("Creating sample employee data...")
                self.create_sample_employee_data()
                return False

            print(f"Raw data loaded with {len(self.employees_df)} rows")

            id_column = None
            name_column = None

            possible_id_columns = ['Employee_ID', 'ID', 'employee_id', 'EmpID', 'Emp_ID', 'Staff_ID', 'StaffID', 'id']
            for col in self.employees_df.columns:
                col_lower = str(col).lower().strip()
                if any(id_term.lower() in col_lower for id_term in possible_id_columns):
                    id_column = col
                    break

            possible_name_columns = ['Employee_Name', 'Name', 'employee_name', 'EmpName', 'Emp_Name', 'Staff_Name',
                                     'StaffName', 'Full_Name', 'FullName', 'name']
            for col in self.employees_df.columns:
                col_lower = str(col).lower().strip()
                if any(name_term.lower() in col_lower for name_term in possible_name_columns):
                    name_column = col
                    break

            if id_column is None and len(self.employees_df.columns) > 0:
                id_column = self.employees_df.columns[0]

            if name_column is None and len(self.employees_df.columns) > 1:
                name_column = self.employees_df.columns[1]
            elif name_column is None and len(self.employees_df.columns) > 0:
                name_column = self.employees_df.columns[0]

            if id_column and name_column:
                self.employees_df = self.employees_df.dropna(subset=[id_column, name_column])

                standardized_data = {
                    'Employee_ID': self.employees_df[id_column].astype(str).str.strip(),
                    'Employee_Name': self.employees_df[name_column].astype(str).str.strip()
                }

                dept_column = None
                for col in self.employees_df.columns:
                    col_lower = str(col).lower().strip()
                    if any(dept_term in col_lower for dept_term in ['department', 'dept', 'division', 'section']):
                        dept_column = col
                        break

                if dept_column:
                    standardized_data['Department'] = self.employees_df[dept_column].astype(str).str.strip()
                else:
                    standardized_data['Department'] = 'General'

                pos_column = None
                for col in self.employees_df.columns:
                    col_lower = str(col).lower().strip()
                    if any(pos_term in col_lower for pos_term in ['position', 'job', 'title', 'role']):
                        pos_column = col
                        break

                if pos_column:
                    standardized_data['Position'] = self.employees_df[pos_column].astype(str).str.strip()
                else:
                    standardized_data['Position'] = 'Staff'

                self.employees_df = pd.DataFrame(standardized_data)
                initial_count = len(self.employees_df)
                self.employees_df = self.employees_df.drop_duplicates(subset=['Employee_ID'], keep='first')
                if len(self.employees_df) < initial_count:
                    print(f"Removed {initial_count - len(self.employees_df)} duplicate employee IDs")

            print(f"Successfully processed {len(self.employees_df)} employees")
            return True

        except Exception as e:
            print(f"Error loading employee data: {e}")
            self.create_sample_employee_data()
            return False

    def create_sample_employee_data(self):
        employee_ids = [f"EMP{str(i + 1).zfill(4)}" for i in range(self.total_employees)]
        employee_names = [f"Employee {i + 1}" for i in range(self.total_employees)]
        departments = ['Operations', 'Maintenance', 'Support', 'Administration', 'Security'] * (
                self.total_employees // 5)
        departments.extend(['Operations'] * (self.total_employees % 5))

        self.employees_df = pd.DataFrame({
            'Employee_ID': employee_ids,
            'Employee_Name': employee_names,
            'Department': departments[:self.total_employees],
            'Position': ['Staff'] * self.total_employees
        })
        print("Created sample employee data")

    def get_month_dates(self, year, month):
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

    def assign_vacation_employees(self):
        vacation_count = int(self.total_employees * self.vacation_percentage)
        vacation_employees = random.sample(range(self.total_employees), vacation_count)
        return vacation_employees

    def calculate_employees_needed_per_shift(self, available_employees, total_days):
        cycle_length = 14
        work_days_per_cycle = 12
        complete_cycles = total_days // cycle_length
        remaining_days = total_days % cycle_length
        avg_working_per_day = (available_employees * work_days_per_cycle) // cycle_length
        employees_per_shift = max((avg_working_per_day // 3), 50)
        return employees_per_shift

    def generate_shift_pattern_for_employee(self, emp_idx, month_dates):
        """
        Generate pattern with:
        - 3 shifts (A/B/C) for most departments
        - 2 shifts (A/B) only for specific departments
        """
        # Get employee department
        if emp_idx < len(self.employees_df):
            employee_department = self.employees_df.iloc[emp_idx]['Department']
        else:
            employee_department = 'General'

        # Define which departments get only 2 shifts
        special_departments = ["Station Staff", "Supervisors"]  # Change to your specific departments

        if employee_department in special_departments:
            # 2-shift pattern for special departments
            return self.generate_2shift_pattern(emp_idx, month_dates)
        else:
            # 3-shift pattern for all other departments
            return self.generate_3shift_pattern(emp_idx, month_dates)

    def generate_2shift_pattern(self, emp_idx, month_dates):
        """Generate pattern with only 2 shifts (A/B) for special departments"""
        pattern = []
        total_days = len(month_dates)

        # Create cycle with 2 shifts only
        base_cycle = []
        shifts = ['A', 'B']  # Only 2 shifts

        # Build cycle: each shift block followed by exactly 2 OFF days
        for shift_idx in range(2):
            # Determine shift type
            current_shift = shifts[(emp_idx + shift_idx) % 2]

            # Fixed: Always use 5 consecutive work days (respecting max_consecutive_work_days)
            work_days = self.max_consecutive_work_days  # Always 5 days

            # Add shift block
            base_cycle.extend([current_shift] * work_days)

            # Add exactly 2 OFF days after each shift block
            base_cycle.extend(['OFF', 'OFF'])

        # Apply employee-specific offset for better distribution
        cycle_offset = emp_idx % len(base_cycle)
        offset_cycle = base_cycle[cycle_offset:] + base_cycle[:cycle_offset]

        # Generate pattern for entire month
        for day_idx in range(total_days):
            cycle_pos = day_idx % len(offset_cycle)
            pattern.append(offset_cycle[cycle_pos])

        return pattern

    def generate_3shift_pattern(self, emp_idx, month_dates):
        """Generate pattern with 3 shifts (A/B/C) for regular departments"""
        pattern = []
        total_days = len(month_dates)

        # Create improved cycle with guaranteed 2 OFF days after each shift block
        base_cycle = []
        shifts = ['A', 'B', 'C']

        # Build cycle: each shift block followed by exactly 2 OFF days
        for shift_idx in range(3):
            # Determine shift type
            current_shift = shifts[(emp_idx + shift_idx) % 3]

            # Fixed: Always use 5 consecutive work days (respecting max_consecutive_work_days)
            work_days = self.max_consecutive_work_days  # Always 5 days

            # Add shift block
            base_cycle.extend([current_shift] * work_days)

            # Add exactly 2 OFF days after each shift block
            base_cycle.extend(['OFF', 'OFF'])

        # Apply employee-specific offset for better distribution
        cycle_offset = emp_idx % len(base_cycle)
        offset_cycle = base_cycle[cycle_offset:] + base_cycle[:cycle_offset]

        # Generate pattern for entire month
        for day_idx in range(total_days):
            cycle_pos = day_idx % len(offset_cycle)
            pattern.append(offset_cycle[cycle_pos])

        return pattern

    def balance_daily_coverage_fixed(self, schedule, month_dates, available_employees, target_per_shift):
        """MINIMAL coverage balancing - NEVER break shift blocks or touch OFF days"""
        print("Balancing coverage while preserving shift blocks and OFF days...")

        # Don't do any balancing that would break shift consistency
        # Your original pattern generation should handle coverage naturally
        # Only make adjustments if there are true gaps, but preserve block integrity

        for date_idx, date in enumerate(month_dates):
            daily_counts = {'A': 0, 'B': 0, 'C': 0}

            # Just count - don't modify
            for emp_idx in available_employees:
                if emp_idx in schedule and date in schedule[emp_idx]:
                    shift = schedule[emp_idx][date]
                    if shift in ['A', 'B', 'C']:
                        daily_counts[shift] += 1

            # Report but don't fix - preserve your original logic
            total_working = sum(daily_counts.values())
            if total_working < 100:  # Only warn about severe issues
                print(
                    f"  Date {date.strftime('%Y-%m-%d')}: Low coverage - A:{daily_counts['A']}, B:{daily_counts['B']}, C:{daily_counts['C']}")

        return schedule

    def assign_standby_employees_fixed(self, schedule, month_dates, available_employees):
        standby_assignments = defaultdict(list)
        employee_standby_count = defaultdict(int)

        for date in month_dates:
            # Determine which shifts to assign standby for this date
            # For most departments: A, B, C
            # For special department: only A, B
            daily_standby_needed = {'A': self.standby_per_shift, 'B': self.standby_per_shift}

            # Add C shift for regular departments
            # You might want to check department here too, but for simplicity:
            daily_standby_needed['C'] = self.standby_per_shift

            for shift in ['A', 'B', 'C']:
                shift_employees = []
                for emp_idx in available_employees:
                    if (emp_idx in schedule and date in schedule[emp_idx] and schedule[emp_idx][date] == shift):
                        shift_employees.append(emp_idx)

                shift_employees.sort(key=lambda x: employee_standby_count[x])

                standby_assigned = 0
                for emp_idx in shift_employees:
                    if standby_assigned >= self.standby_per_shift:
                        break

                    if employee_standby_count[emp_idx] < 3:
                        schedule[emp_idx][date] = f'STANDBY_{shift}'
                        standby_assignments[emp_idx].append((date, shift))
                        employee_standby_count[emp_idx] += 1
                        standby_assigned += 1

                if standby_assigned < self.standby_per_shift:
                    remaining = self.standby_per_shift - standby_assigned
                    additional_employees = [emp for emp in shift_employees if
                                            emp not in [e for e, _ in standby_assignments.items() if any(
                                                d == date and s == shift for d, s in standby_assignments[e])]]

                    for emp_idx in additional_employees[:remaining]:
                        schedule[emp_idx][date] = f'STANDBY_{shift}'
                        standby_assignments[emp_idx].append((date, shift))
                        employee_standby_count[emp_idx] += 1

        return schedule, standby_assignments

    def generate_monthly_roster(self, year, month):
        print(f"Generating roster for {year}-{month:02d}")

        loaded = self.load_employee_data()
        if not loaded:
            print("Failed to load employee data. Aborting.")
            return None, None, None

        self.total_employees = len(self.employees_df)
        print(f"Using actual employee count: {self.total_employees}")

        month_dates = self.get_month_dates(year, month)
        vacation_employees = self.assign_vacation_employees()
        available_employees = [i for i in range(self.total_employees) if i not in vacation_employees]

        target_per_shift = self.calculate_employees_needed_per_shift(len(available_employees), len(month_dates))

        print(f"Month: {year}-{month:02d} ({len(month_dates)} days)")
        print(f"Total employees: {self.total_employees}")
        print(f"Vacation employees: {len(vacation_employees)}")
        print(f"Available employees: {len(available_employees)}")
        print(f"Target employees per shift: {target_per_shift}")

        schedule = {}

        for emp_idx in vacation_employees:
            schedule[emp_idx] = {}
            for date in month_dates:
                schedule[emp_idx][date] = 'VACATION'

        for i, emp_idx in enumerate(available_employees):
            pattern = self.generate_shift_pattern_for_employee(emp_idx, month_dates)
            schedule[emp_idx] = {}
            for date, shift_assignment in zip(month_dates, pattern):
                schedule[emp_idx][date] = shift_assignment

        for emp_idx in range(self.total_employees):
            if emp_idx not in schedule:
                print(f"WARNING: Employee {emp_idx} has NO schedule entry! Assigning OFF.")
                schedule[emp_idx] = {date: 'OFF' for date in month_dates}

        schedule = self.balance_daily_coverage_fixed(schedule, month_dates, available_employees, target_per_shift)
        schedule, standby_assignments = self.assign_standby_employees_fixed(schedule, month_dates, available_employees)

        return schedule, month_dates, standby_assignments

    def create_roster_dataframe(self, schedule, month_dates, year, month):
        roster_data = []

        for emp_idx in range(self.total_employees):
            emp_data = self.employees_df.iloc[emp_idx]

            employee_id = emp_data.get('Employee_ID',
                                       emp_data.get('ID', emp_data.get('employee_id', f'EMP{emp_idx + 1:04d}')))
            employee_name = emp_data.get('Employee_Name',
                                         emp_data.get('Name', emp_data.get('employee_name', f'Employee {emp_idx + 1}')))
            department = emp_data.get('Department', emp_data.get('department', 'General'))

            row = {
                'Employee_ID': employee_id,
                'Employee_Name': employee_name,
                'Department': department
            }

            for date in month_dates:
                # Updated date format: 'Day_Wed, 1-Oct-25'
                day_str = f"{date.strftime('%a')}, {date.day}-{date.strftime('%b')}-{date.strftime('%y')}"
                if emp_idx in schedule and date in schedule[emp_idx]:
                    row[f'Day_{day_str}'] = schedule[emp_idx][date]
                else:
                    row[f'Day_{day_str}'] = 'ERROR_NO_SCHEDULE'

            monthly_schedule = []
            for date in month_dates:
                if emp_idx in schedule and date in schedule[emp_idx]:
                    monthly_schedule.append(schedule[emp_idx][date])
                else:
                    monthly_schedule.append('ERROR_NO_SCHEDULE')

            row['A_Shifts'] = monthly_schedule.count('A')
            row['B_Shifts'] = monthly_schedule.count('B')
            row['C_Shifts'] = monthly_schedule.count('C')
            row['Total_Work_Days'] = sum(1 for x in monthly_schedule if x in ['A', 'B', 'C'])
            row['Days_Off'] = monthly_schedule.count('OFF')
            row['Standby_A'] = sum(1 for x in monthly_schedule if x == 'STANDBY_A')
            row['Standby_B'] = sum(1 for x in monthly_schedule if x == 'STANDBY_B')
            row['Standby_C'] = sum(1 for x in monthly_schedule if x == 'STANDBY_C')
            row['Total_Standby'] = row['Standby_A'] + row['Standby_B'] + row['Standby_C']
            row['Vacation_Days'] = monthly_schedule.count('VACATION')

            roster_data.append(row)

        return pd.DataFrame(roster_data)

    def analyze_consecutive_work_blocks(self, roster_df, month_dates):
        """Analyze consecutive working days for each employee"""
        consecutive_violations = []
        employee_stats = []

        for emp_idx in range(len(roster_df)):
            employee_id = roster_df.iloc[emp_idx]['Employee_ID']
            employee_name = roster_df.iloc[emp_idx]['Employee_Name']

            # Get employee's monthly schedule
            schedule = []
            for date in month_dates:
                day_str = f"{date.strftime('%a')}, {date.day}-{date.strftime('%b')}-{date.strftime('%y')}"
                day_column = f'Day_{day_str}'
                if day_column in roster_df.columns:
                    shift = roster_df.iloc[emp_idx][day_column]
                    schedule.append(shift)

            # Analyze consecutive work blocks
            work_blocks = []
            current_block_start = None
            current_block_length = 0
            current_shift = None

            for day_idx, shift in enumerate(schedule):
                if shift in ['A', 'B', 'C']:  # Working day
                    if current_block_start is None:
                        current_block_start = day_idx
                        current_block_length = 1
                        current_shift = shift
                    else:
                        current_block_length += 1
                        # Check if shift type changed within the block
                        if current_shift != shift:
                            current_shift = f"{current_shift}-{shift}"
                else:  # OFF, VACATION, or STANDBY day
                    if current_block_start is not None:
                        # End of work block
                        start_date = month_dates[current_block_start]
                        end_date = month_dates[current_block_start + current_block_length - 1]

                        work_blocks.append({
                            'start_date': start_date.strftime('%d-%b'),
                            'end_date': end_date.strftime('%d-%b'),
                            'length': current_block_length,
                            'shift_type': current_shift
                        })

                        # Check for violations
                        if current_block_length > self.max_consecutive_work_days:
                            consecutive_violations.append({
                                'Employee_ID': employee_id,
                                'Employee_Name': employee_name,
                                'Block_Start': start_date.strftime('%d-%b'),
                                'Block_End': end_date.strftime('%d-%b'),
                                'Consecutive_Days': current_block_length,
                                'Shift_Type': current_shift,
                                'Violation': f"Exceeds {self.max_consecutive_work_days} days limit"
                            })

                        current_block_start = None
                        current_block_length = 0
                        current_shift = None

            # Handle case where month ends with a work block
            if current_block_start is not None:
                start_date = month_dates[current_block_start]
                end_date = month_dates[current_block_start + current_block_length - 1]

                work_blocks.append({
                    'start_date': start_date.strftime('%d-%b'),
                    'end_date': end_date.strftime('%d-%b'),
                    'length': current_block_length,
                    'shift_type': current_shift
                })

                if current_block_length > self.max_consecutive_work_days:
                    consecutive_violations.append({
                        'Employee_ID': employee_id,
                        'Employee_Name': employee_name,
                        'Block_Start': start_date.strftime('%d-%b'),
                        'Block_End': end_date.strftime('%d-%b'),
                        'Consecutive_Days': current_block_length,
                        'Shift_Type': current_shift,
                        'Violation': f"Exceeds {self.max_consecutive_work_days} days limit"
                    })

            # Calculate employee statistics
            if work_blocks:
                max_consecutive = max(block['length'] for block in work_blocks)
                avg_consecutive = sum(block['length'] for block in work_blocks) / len(work_blocks)
                total_blocks = len(work_blocks)

                employee_stats.append({
                    'Employee_ID': employee_id,
                    'Employee_Name': employee_name,
                    'Total_Work_Blocks': total_blocks,
                    'Max_Consecutive_Days': max_consecutive,
                    'Avg_Consecutive_Days': round(avg_consecutive, 1),
                    'Work_Blocks_Detail': ' | '.join([f"{block['start_date']}-{block['end_date']}({block['length']}d)"
                                                      for block in work_blocks])
                })

        return pd.DataFrame(consecutive_violations), pd.DataFrame(employee_stats)

    def validate_daily_coverage(self, roster_df, month_dates):
        coverage_report = []

        for date in month_dates:
            # Updated date format to match the roster columns
            day_str = f"{date.strftime('%a')}, {date.day}-{date.strftime('%b')}-{date.strftime('%y')}"
            day_column = f'Day_{day_str}'

            if day_column in roster_df.columns:
                daily_assignments = roster_df[day_column].value_counts()

                coverage_report.append({
                    'Date': day_str,
                    'A_Shift': daily_assignments.get('A', 0),
                    'B_Shift': daily_assignments.get('B', 0),
                    'C_Shift': daily_assignments.get('C', 0),
                    'Standby_A': daily_assignments.get('STANDBY_A', 0),
                    'Standby_B': daily_assignments.get('STANDBY_B', 0),
                    'Standby_C': daily_assignments.get('STANDBY_C', 0),
                    'Days_Off': daily_assignments.get('OFF', 0),
                    'Vacation': daily_assignments.get('VACATION', 0)
                })

        return pd.DataFrame(coverage_report)

    def save_roster_to_excel(self, roster_df, month_dates, year, month, output_path=None):
        if output_path is None:
            documents_folder = Path.home() / "Documents"
            documents_folder.mkdir(exist_ok=True)

            # Use fixed filename to overwrite existing file
            output_path = documents_folder / f"Monthly_Roster_{year}_{month:02d}.xlsx"
            output_path = str(output_path)
            print(f"Saving roster to: {output_path}")

        coverage_df = self.validate_daily_coverage(roster_df, month_dates)

        # Analyze consecutive work blocks
        print("Analyzing consecutive work blocks...")
        violations_df, employee_stats_df = self.analyze_consecutive_work_blocks(roster_df, month_dates)

        try:
            with pd.ExcelWriter(output_path, engine='xlsxwriter') as writer:
                roster_df.to_excel(writer, sheet_name='Monthly_Roster', index=False)
                coverage_df.to_excel(writer, sheet_name='Daily_Coverage', index=False)
                employee_stats_df.to_excel(writer, sheet_name='Consecutive_Days_Analysis', index=False)

                # Only add violations sheet if there are violations
                if not violations_df.empty:
                    violations_df.to_excel(writer, sheet_name='Violations', index=False)

                workbook = writer.book
                roster_worksheet = writer.sheets['Monthly_Roster']
                coverage_worksheet = writer.sheets['Daily_Coverage']
                stats_worksheet = writer.sheets['Consecutive_Days_Analysis']

                header_format = workbook.add_format({
                    'bold': True,
                    'text_wrap': True,
                    'valign': 'top',
                    'fg_color': '#D7E4BC',
                    'border': 1
                })

                # Format for violations (red background)
                violation_format = workbook.add_format({
                    'fg_color': '#FFE6E6',
                    'border': 1,
                    'align': 'center'
                })

                shift_formats = {
                    'A': workbook.add_format({'fg_color': '#FFE6E6', 'border': 1, 'align': 'center'}),
                    'B': workbook.add_format({'fg_color': '#E6F3FF', 'border': 1, 'align': 'center'}),
                    'C': workbook.add_format({'fg_color': '#F0E6FF', 'border': 1, 'align': 'center'}),
                    'OFF': workbook.add_format({'fg_color': '#F0F0F0', 'border': 1, 'align': 'center'}),
                    'STANDBY_A': workbook.add_format({'fg_color': '#FFD700', 'border': 1, 'align': 'center'}),
                    'STANDBY_B': workbook.add_format({'fg_color': '#FFA500', 'border': 1, 'align': 'center'}),
                    'STANDBY_C': workbook.add_format({'fg_color': '#FF8C00', 'border': 1, 'align': 'center'}),
                    'VACATION': workbook.add_format({'fg_color': '#90EE90', 'border': 1, 'align': 'center'}),
                    'ERROR_NO_SCHEDULE': workbook.add_format(
                        {'fg_color': '#FF0000', 'border': 1, 'align': 'center', 'font_color': '#FFFFFF'})
                }

                # Format Monthly_Roster sheet
                for col_num, column in enumerate(roster_df.columns):
                    roster_worksheet.write(0, col_num, column, header_format)
                    if column.startswith('Day_'):
                        roster_worksheet.set_column(col_num, col_num, 15)  # Increased width for new format
                    else:
                        roster_worksheet.set_column(col_num, col_num, 15)

                for row_num in range(1, len(roster_df) + 1):
                    for col_num, column in enumerate(roster_df.columns):
                        if column.startswith('Day_'):
                            cell_value = roster_df.iloc[row_num - 1, col_num]
                            if cell_value in shift_formats:
                                roster_worksheet.write(row_num, col_num, cell_value, shift_formats[cell_value])
                            else:
                                roster_worksheet.write(row_num, col_num, cell_value)

                # Format Daily_Coverage sheet
                for col_num, column in enumerate(coverage_df.columns):
                    coverage_worksheet.write(0, col_num, column, header_format)
                    coverage_worksheet.set_column(col_num, col_num, 15)  # Increased width for new format

                # Format Consecutive_Days_Analysis sheet
                for col_num, column in enumerate(employee_stats_df.columns):
                    stats_worksheet.write(0, col_num, column, header_format)
                    if column == 'Work_Blocks_Detail':
                        stats_worksheet.set_column(col_num, col_num, 40)  # Wide column for details
                    elif column == 'Max_Consecutive_Days':
                        stats_worksheet.set_column(col_num, col_num, 18)
                    else:
                        stats_worksheet.set_column(col_num, col_num, 15)

                # Highlight violations in the analysis sheet
                for row_num in range(1, len(employee_stats_df) + 1):
                    max_consecutive = employee_stats_df.iloc[row_num - 1]['Max_Consecutive_Days']
                    for col_num, column in enumerate(employee_stats_df.columns):
                        cell_value = employee_stats_df.iloc[row_num - 1, col_num]
                        if column == 'Max_Consecutive_Days' and max_consecutive > self.max_consecutive_work_days:
                            stats_worksheet.write(row_num, col_num, cell_value, violation_format)
                        else:
                            stats_worksheet.write(row_num, col_num, cell_value)

                # Format Violations sheet if it exists
                if not violations_df.empty:
                    violations_worksheet = writer.sheets['Violations']
                    for col_num, column in enumerate(violations_df.columns):
                        violations_worksheet.write(0, col_num, column, header_format)
                        violations_worksheet.set_column(col_num, col_num, 18)

                summary_data = {
                    'Metric': [
                        'Total Employees',
                        'Employees on Vacation',
                        'Available Employees',
                        'Total A Shifts',
                        'Total B Shifts',
                        'Total C Shifts',
                        'Total Work Days',
                        'Total Days Off',
                        'Total Standby Days',
                        'Avg A Shift per Day',
                        'Avg B Shift per Day',
                        'Avg C Shift per Day',
                        'Employees with Violations',
                        'Max Consecutive Days Found',
                        'Total Work Blocks'
                    ],
                    'Value': [
                        len(roster_df),
                        int((roster_df['Vacation_Days'] > 0).sum()),
                        int((roster_df['Vacation_Days'] == 0).sum()),
                        int(roster_df['A_Shifts'].sum()),
                        int(roster_df['B_Shifts'].sum()),
                        int(roster_df['C_Shifts'].sum()),
                        int(roster_df['Total_Work_Days'].sum()),
                        int(roster_df['Days_Off'].sum()),
                        int(roster_df['Total_Standby'].sum()),
                        round(coverage_df['A_Shift'].mean(), 1),
                        round(coverage_df['B_Shift'].mean(), 1),
                        round(coverage_df['C_Shift'].mean(), 1),
                        len(violations_df) if not violations_df.empty else 0,
                        int(employee_stats_df['Max_Consecutive_Days'].max()) if not employee_stats_df.empty else 0,
                        int(employee_stats_df['Total_Work_Blocks'].sum()) if not employee_stats_df.empty else 0
                    ]
                }

                summary_df = pd.DataFrame(summary_data)
                summary_df.to_excel(writer, sheet_name='Summary', index=False)

            print(f"Roster successfully saved to: {output_path}")

            # Print consecutive days analysis summary
            if not employee_stats_df.empty:
                max_consecutive_found = employee_stats_df['Max_Consecutive_Days'].max()
                violations_count = len(violations_df)
                print(f"\n=== CONSECUTIVE DAYS ANALYSIS ===")
                print(f"Maximum consecutive days found: {max_consecutive_found}")
                print(f"Employees with violations (>{self.max_consecutive_work_days} days): {violations_count}")
                if violations_count > 0:
                    print("⚠️  WARNING: Some employees exceed the consecutive work days limit!")
                else:
                    print("✅ SUCCESS: All employees respect the consecutive work days limit!")

            return output_path, coverage_df

        except PermissionError:
            print("ERROR: Could not save file. Please close any open instance of Excel and try again.")
            raise
        except Exception as e:
            print(f"Unexpected error saving file: {e}")
            raise


def main():
    excel_file_path = r"C:\Users\a_abd\PyCharmMiscProject\generate_employee_list"
    total_employees = 2500

    generator = ShiftRosterGenerator(excel_file_path, total_employees)

    current_date = datetime.now()
    year = 2025
    month = 10

    print("=== SHIFT ROSTER GENERATOR (FIXED) ===")
    print(f"Target month: {year}-{month:02d}")
    print("=" * 50)

    try:
        print("Generating schedule...")
        schedule, month_dates, standby_assignments = generator.generate_monthly_roster(year, month)

        if schedule is None:
            print("Generation failed.")
            return

        print("Creating roster DataFrame...")
        roster_df = generator.create_roster_dataframe(schedule, month_dates, year, month)

        print("Saving Excel file...")
        output_file, coverage_df = generator.save_roster_to_excel(roster_df, month_dates, year, month)

        print("\n=== ROSTER SUMMARY ===")
        print(f"Total Employees: {len(roster_df)}")
        print(f"Employees on Vacation: {(roster_df['Vacation_Days'] > 0).sum()}")
        print(f"Available Employees: {(roster_df['Vacation_Days'] == 0).sum()}")

        print(f"\n=== COVERAGE VALIDATION ===")
        print(f"Average A Shift Coverage: {coverage_df['A_Shift'].mean():.1f} employees/day")
        print(f"Average B Shift Coverage: {coverage_df['B_Shift'].mean():.1f} employees/day")
        print(f"Average C Shift Coverage: {coverage_df['C_Shift'].mean():.1f} employees/day")

        zero_a_days = (coverage_df['A_Shift'] == 0).sum()
        zero_b_days = (coverage_df['B_Shift'] == 0).sum()
        zero_c_days = (coverage_df['C_Shift'] == 0).sum()

        print(f"\nDays with zero A coverage: {zero_a_days}")
        print(f"Days with zero B coverage: {zero_b_days}")
        print(f"Days with zero C coverage: {zero_c_days}")

        if zero_a_days + zero_b_days + zero_c_days == 0:
            print("SUCCESS: All shifts have coverage every day!")
        else:
            print("Some coverage gaps remain")

        print(f"\nRoster saved to: {output_file}")

    except Exception as e:
        print(f"Error generating roster: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
