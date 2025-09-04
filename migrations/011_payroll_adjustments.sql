CREATE TABLE IF NOT EXISTS payroll_adjustments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  period_start DATE NOT NULL,
  hours_adjustment DECIMAL(10,2) NOT NULL DEFAULT 0,
  note VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_emp_period (employee_id, period_start),
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

