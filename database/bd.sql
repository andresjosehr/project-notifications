CREATE TABLE projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title LONGTEXT,
  description LONGTEXT,
  price LONGTEXT,
  skills LONGTEXT,
  link VARCHAR(255),
  platform ENUM('workana','upwork') NOT NULL,
  client_name VARCHAR(255),
  client_country VARCHAR(100),
  client_rating DECIMAL(3,2),
  payment_verified BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_max_project BOOLEAN DEFAULT FALSE,
  date VARCHAR(50),
  time_ago VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workana_email VARCHAR(255) NOT NULL UNIQUE,
  workana_password VARCHAR(255) NOT NULL,
  proposal_directives LONGTEXT NOT NULL,
  professional_profile LONGTEXT NOT NULL,
  telegram_user VARCHAR(255) NOT NULL,
  workana_session_data LONGTEXT,
  session_expires_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE user_proposals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  project_id INT NOT NULL,
  project_platform ENUM('workana','upwork') NOT NULL DEFAULT 'workana',
  proposal_sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  proposal_content LONGTEXT,
  status ENUM('sent','accepted','rejected','pending') DEFAULT 'sent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY user_project_unique (user_id,project_id,project_platform),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);