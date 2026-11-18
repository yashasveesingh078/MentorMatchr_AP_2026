// =============================================================================
// MentorMatchr: Database Seeder
// Seeds master data, faculty, hackathon, problem statements, teams, and assignments.
// =============================================================================

export function seedData(db) {
  // Check if already seeded
  const count = db.prepare('SELECT COUNT(*) AS total FROM department').get().total;
  if (count > 0) return;

  db.exec(`BEGIN TRANSACTION;`);

  try {
    // 1. Departments
    const insertDept = db.prepare('INSERT INTO department (department_code, department_name) VALUES (?, ?)');
    insertDept.run('CSE', 'Computer Science and Engineering');
    insertDept.run('ECE', 'Electronics and Communication Engineering');
    insertDept.run('BME', 'Biomedical Engineering');
    insertDept.run('IT', 'Information Technology');
    insertDept.run('MECH', 'Mechanical and Mechatronics Engineering');

    // 2. Domains
    const insertDomain = db.prepare('INSERT INTO domain (domain_name, description) VALUES (?, ?)');
    insertDomain.run('AI & Machine Learning', 'Artificial Intelligence, Deep Learning, Computer Vision, and NLP');
    insertDomain.run('Healthcare Tech', 'Biomedical devices, clinical informatics, and health diagnostics');
    insertDomain.run('Cybersecurity', 'Network security, applied cryptography, and threat analysis');
    insertDomain.run('Web & Cloud Systems', 'Scalable web architecture, distributed systems, and microservices');
    insertDomain.run('FinTech & Blockchain', 'Decentralized ledgers, smart contracts, and computational finance');
    insertDomain.run('IoT & Smart Systems', 'Embedded hardware, sensor telemetry, and edge intelligence');
    insertDomain.run('Data Science & Analytics', 'Big data engineering, predictive modeling, and statistical analytics');

    // 3. Keywords
    const keywords = [
      'Python', 'PyTorch', 'TensorFlow', 'OpenCV', 'Transformers',
      'Medical Imaging', 'DICOM', 'Bio-Signals', 'React', 'Node.js',
      'PostgreSQL', 'FastAPI', 'Solidity', 'Smart Contracts', 'Zero-Knowledge',
      'Docker', 'Kubernetes', 'Edge AI', 'MQTT', 'Sensor Networks',
      'Rust', 'Next.js', 'Bioinformatics'
    ];
    const insertKeyword = db.prepare('INSERT INTO keyword (keyword_name) VALUES (?)');
    keywords.forEach(kw => insertKeyword.run(kw));

    // 4. Expertise Areas
    const expertiseAreas = [
      'Computer Vision', 'Deep Learning', 'Medical Image Processing', 'Bio-Signals Analysis',
      'Full-Stack Web Development', 'Cloud Architecture', 'Blockchain & Cryptography',
      'Network Security & Forensics', 'Embedded Edge Computing', 'Natural Language Processing'
    ];
    const insertExp = db.prepare('INSERT INTO expertise_area (expertise_name) VALUES (?)');
    expertiseAreas.forEach(exp => insertExp.run(exp));

    // 5. Faculty
    const insertFaculty = db.prepare(`
      INSERT INTO faculty (employee_code, full_name, email, phone, designation, department_id, max_teams, is_available)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Faculty ID 1: Dr. Arun Sharma (Professor, CSE, max: 2) -> Reference Image Top Match
    insertFaculty.run('FAC101', 'Dr. Arun Sharma', 'arun.sharma@inst.edu', '+91 98765 11001', 'Professor', 1, 2, 1);
    // Faculty ID 2: Dr. Sanjay Bhattacharya (Assoc Prof, BME, max: 2) -> Reference Image Second Match
    insertFaculty.run('FAC102', 'Dr. Sanjay Bhattacharya', 'sanjay.b@inst.edu', '+91 98765 11002', 'Associate Professor', 3, 2, 1);
    // Faculty ID 3: Dr. Radhika Sharma (Professor, CSE, max: 3)
    insertFaculty.run('FAC103', 'Dr. Radhika Sharma', 'rsharma@inst.edu', '+91 98765 11003', 'Professor', 1, 3, 1);
    // Faculty ID 4: Dr. Karthik Iyer (Assoc Prof, IT, max: 3)
    insertFaculty.run('FAC104', 'Dr. Karthik Iyer', 'kiyer@inst.edu', '+91 98765 11004', 'Associate Professor', 4, 3, 1);
    // Faculty ID 5: Dr. Meera Nambiar (Assoc Prof, ECE, max: 3)
    insertFaculty.run('FAC105', 'Dr. Meera Nambiar', 'meera.n@inst.edu', '+91 98765 11005', 'Associate Professor', 2, 3, 1);
    // Faculty ID 6: Dr. Vikramaditya Sen (Asst Prof, ECE, max: 2)
    insertFaculty.run('FAC106', 'Dr. Vikramaditya Sen', 'vsen@inst.edu', '+91 98765 11006', 'Assistant Professor', 2, 2, 1);
    // Faculty ID 7: Dr. Ananya Mukherjee (Asst Prof, CSE, max: 3)
    insertFaculty.run('FAC107', 'Dr. Ananya Mukherjee', 'ananya.m@inst.edu', '+91 98765 11007', 'Assistant Professor', 1, 3, 1);

    // Faculty Domains
    const insertFacDomain = db.prepare('INSERT INTO faculty_domain (faculty_id, domain_id, is_primary) VALUES (?, ?, ?)');
    insertFacDomain.run(1, 1, 1); // Dr. Arun: Primary AI & Machine Learning
    insertFacDomain.run(1, 2, 0); // Dr. Arun: Secondary Healthcare Tech
    insertFacDomain.run(2, 2, 1); // Dr. Sanjay: Primary Healthcare Tech
    insertFacDomain.run(2, 1, 0); // Dr. Sanjay: Secondary AI & Machine Learning
    insertFacDomain.run(3, 1, 1); // Dr. Radhika: Primary AI
    insertFacDomain.run(3, 7, 0); // Dr. Radhika: Secondary Data Science
    insertFacDomain.run(4, 4, 1); // Dr. Karthik: Primary Web & Cloud
    insertFacDomain.run(4, 5, 0); // Dr. Karthik: Secondary FinTech
    insertFacDomain.run(5, 3, 1); // Dr. Meera: Primary Cybersecurity
    insertFacDomain.run(5, 5, 0); // Dr. Meera: Secondary FinTech
    insertFacDomain.run(6, 6, 1); // Dr. Vikramaditya: Primary IoT
    insertFacDomain.run(6, 1, 0); // Dr. Vikramaditya: Secondary AI
    insertFacDomain.run(7, 7, 1); // Dr. Ananya: Primary Data Science
    insertFacDomain.run(7, 2, 0); // Dr. Ananya: Secondary Healthcare Tech

    // Faculty Expertise Areas
    const insertFacExp = db.prepare('INSERT INTO faculty_expertise (faculty_id, expertise_id, years_of_experience) VALUES (?, ?, ?)');
    insertFacExp.run(1, 1, 8); // Computer Vision (8 yrs)
    insertFacExp.run(1, 2, 6); // Deep Learning (6 yrs)
    insertFacExp.run(1, 3, 5); // Medical Image Processing (5 yrs)

    insertFacExp.run(2, 3, 10); // Medical Image Processing (10 yrs)
    insertFacExp.run(2, 4, 7);  // Bio-Signals Analysis (7 yrs)

    insertFacExp.run(3, 2, 9); // Deep Learning (9 yrs)
    insertFacExp.run(3, 10, 6); // NLP (6 yrs)

    insertFacExp.run(4, 5, 8); // Full-Stack (8 yrs)
    insertFacExp.run(4, 6, 5); // Cloud Architecture (5 yrs)

    insertFacExp.run(5, 7, 7); // Blockchain & Crypto (7 yrs)
    insertFacExp.run(5, 8, 5); // Network Security (5 yrs)

    insertFacExp.run(6, 9, 6); // Embedded Edge (6 yrs)
    insertFacExp.run(6, 1, 4); // Computer Vision (4 yrs)

    insertFacExp.run(7, 2, 5); // Deep Learning (5 yrs)
    insertFacExp.run(7, 4, 4); // Bio-Signals (4 yrs)

    // Faculty Keywords
    const insertFacKw = db.prepare('INSERT INTO faculty_keyword (faculty_id, keyword_id) VALUES (?, ?)');
    // Dr. Arun: Python(1), PyTorch(2), TF(3), OpenCV(4), Transformers(5), Medical Imaging(6), DICOM(7)
    [1, 2, 3, 4, 5, 6, 7].forEach(kid => insertFacKw.run(1, kid));
    // Dr. Sanjay: Medical Imaging(6), DICOM(7), Bio-Signals(8), Python(1), Bioinformatics(23)
    [6, 7, 8, 1, 23].forEach(kid => insertFacKw.run(2, kid));
    // Dr. Radhika: Python(1), PyTorch(2), TF(3), OpenCV(4), Transformers(5), PostgreSQL(11)
    [1, 2, 3, 4, 5, 11].forEach(kid => insertFacKw.run(3, kid));
    // Dr. Karthik: React(9), Node(10), Postgres(11), FastAPI(12), Docker(16), K8s(17), Next.js(22)
    [9, 10, 11, 12, 16, 17, 22].forEach(kid => insertFacKw.run(4, kid));
    // Dr. Meera: Solidity(13), Smart Contracts(14), ZK(15), Rust(21), Python(1), Postgres(11)
    [13, 14, 15, 21, 1, 11].forEach(kid => insertFacKw.run(5, kid));
    // Dr. Vikramaditya: Edge AI(18), MQTT(19), Sensor Networks(20), Python(1), OpenCV(4), Docker(16)
    [18, 19, 20, 1, 4, 16].forEach(kid => insertFacKw.run(6, kid));
    // Dr. Ananya: Python(1), PyTorch(2), Medical Imaging(6), Bio-Signals(8), Postgres(11), Bioinformatics(23)
    [1, 2, 6, 8, 11, 23].forEach(kid => insertFacKw.run(7, kid));

    // 6. Hackathon
    const insertHackathon = db.prepare(`
      INSERT INTO hackathon (hackathon_name, edition_year, start_date, end_date, venue)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertHackathon.run('CodeFest', 2026, '2026-11-20', '2026-11-22', 'Campus Innovation Pavilion & Main Auditorium');

    // 7. Coordinators
    const insertCoord = db.prepare('INSERT INTO coordinator (full_name, email, phone) VALUES (?, ?, ?)');
    insertCoord.run('Priya Nair', 'p.nair@codefest.edu', '+91 98765 43210');
    insertCoord.run('Amitav Sen', 'a.sen@codefest.edu', '+91 98765 43211');

    // 8. Problem Statements
    const insertPS = db.prepare(`
      INSERT INTO problem_statement (hackathon_id, ps_code, title, description, domain_id, difficulty)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    // PS-04 -> From reference image!
    insertPS.run(1, 'PS-04', 'Automated Medical Imaging Diagnostics Using Transformer Ensembles',
      'Develop high-throughput vision transformer pipelines for early lesion detection in multi-slice DICOM scans.', 1, 'Hard');
    // PS-07 -> SecureLedger
    insertPS.run(1, 'PS-07', 'SecureLedger: Decentralized Settlement with Zero-Knowledge Auditing',
      'Design smart contracts and ZK proof verifiers for cross-institution asset reconciliation without privacy leakage.', 5, 'Hard');
    // PS-02 -> AgriSense IoT
    insertPS.run(1, 'PS-02', 'AgriSense: Autonomous Crop Stress Detection via Edge-AI Drone Vision',
      'Deploy lightweight computer vision models onto edge drone companion computers for real-time crop moisture and pest stress analysis.', 6, 'Medium');
    // PS-05 -> CampusPulse
    insertPS.run(1, 'PS-05', 'CampusPulse: Real-Time Event Portal & Dynamic Micro-Credential Engine',
      'Scalable web portal for hackathon submissions, live scoring broadcasts, and cryptographically verified digital credentials.', 4, 'Medium');
    // PS-09 -> BioShield
    insertPS.run(1, 'PS-09', 'BioShield: Multi-Modal Sepsis Warning Engine via Sensor Telemetry',
      'Continuous patient vital sign and bio-signal processing for early shock prediction in intensive care units.', 2, 'Hard');

    // Problem Keywords
    const insertPsKw = db.prepare('INSERT INTO problem_keyword (problem_id, keyword_id) VALUES (?, ?)');
    // PS-04 keywords: Python(1), PyTorch(2), Transformers(5), Medical Imaging(6), DICOM(7)
    [1, 2, 5, 6, 7].forEach(kid => insertPsKw.run(1, kid));
    // PS-07 keywords: Solidity(13), Smart Contracts(14), ZK(15), Rust(21), PostgreSQL(11)
    [13, 14, 15, 21, 11].forEach(kid => insertPsKw.run(2, kid));
    // PS-02 keywords: Python(1), OpenCV(4), Edge AI(18), MQTT(19), Sensor Networks(20)
    [1, 4, 18, 19, 20].forEach(kid => insertPsKw.run(3, kid));
    // PS-05 keywords: React(9), Node.js(10), PostgreSQL(11), FastAPI(12), Docker(16), Next.js(22)
    [9, 10, 11, 12, 16, 22].forEach(kid => insertPsKw.run(4, kid));
    // PS-09 keywords: Python(1), PyTorch(2), Medical Imaging(6), DICOM(7), Bio-Signals(8), Bioinformatics(23)
    [1, 2, 6, 7, 8, 23].forEach(kid => insertPsKw.run(5, kid));

    // 9. Teams
    const insertTeam = db.prepare(`
      INSERT INTO team (hackathon_id, team_name, team_size, contact_email)
      VALUES (?, ?, ?, ?)
    `);
    insertTeam.run(1, 'CareSync AI', 4, 'lead@caresync.ai');     // Team ID 1
    insertTeam.run(1, 'SecureLedger', 4, 'team@secureledger.dev'); // Team ID 2
    insertTeam.run(1, 'AgriSense IoT', 3, 'contact@agrisense.io'); // Team ID 3
    insertTeam.run(1, 'ByteBuilders', 4, 'bytebuilders@codefest.edu'); // Team ID 4
    insertTeam.run(1, 'NeuralNomads', 4, 'nomads@codefest.edu');  // Team ID 5

    // Team Problem Selections
    const insertSel = db.prepare('INSERT INTO team_problem_selection (team_id, problem_id) VALUES (?, ?)');
    insertSel.run(1, 1); // CareSync AI -> PS-04
    insertSel.run(2, 2); // SecureLedger -> PS-07
    insertSel.run(3, 3); // AgriSense IoT -> PS-02
    insertSel.run(4, 4); // ByteBuilders -> PS-05
    insertSel.run(5, 1); // NeuralNomads -> PS-04

    // Initial Assignments
    const insertAssign = db.prepare(`
      INSERT INTO mentor_assignment (team_id, faculty_id, assigned_by, match_score, status)
      VALUES (?, ?, ?, ?, ?)
    `);
    // Team 1 (CareSync AI) assigned to Dr. Arun Sharma (Reference Image Match!)
    insertAssign.run(1, 1, 1, 86.70, 'ACTIVE');
    // Team 4 (ByteBuilders) assigned to Dr. Karthik Iyer
    insertAssign.run(4, 4, 1, 91.00, 'ACTIVE');

    // 10. Mentorship Requests (Student Guidance Tickets)
    const insertReq = db.prepare(`
      INSERT INTO mentorship_request (team_id, faculty_id, milestone_title, description, status, mentor_notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertReq.run(
      1, 1,
      'Vision Transformer Preprocessing & Attention Maps',
      'Need guidance on multi-slice DICOM windowing and attention rollout visualization for the radiology UI.',
      'PENDING',
      null
    );
    insertReq.run(
      4, 4,
      'PostgreSQL Connection Pool & JWT Architecture',
      'Feedback on microservice authentication tokens and database pooling under hackathon evaluation load.',
      'COMPLETED',
      'Recommended pool max limit 25 and added composite index on user_credentials. Approved architecture.'
    );

    db.exec(`COMMIT;`);
    console.log('✅ MentorMatchr database initialized and seeded successfully.');
  } catch (err) {
    db.exec(`ROLLBACK;`);
    console.error('❌ Error seeding database:', err);
    throw err;
  }
}
