DELETE FROM User;
DELETE FROM Course;
DELETE FROM TeacherCourse;
DELETE FROM Class;
DELETE FROM Lecture;
DELETE FROM Booking;
DELETE FROM Enrollment;

INSERT INTO User(userId, type, firstName, lastName, email, password) VALUES(1, 'STUDENT', 'Aldo', 'Baglio', 'aldo.baglio@agg.it', 'aldo');
INSERT INTO User(userId, type, firstName, lastName, email, password) VALUES(2, 'STUDENT', 'Giovanni', 'Storti', 'giovanni.storti@agg.it', 'giovanni');
INSERT INTO User(userId, type, firstName, lastName, email, password) VALUES(3, 'STUDENT', 'Silvana', 'Fallisi', 'silvana.fallisi@agg.it', 'silvana');

INSERT INTO Course(courseId, description, year) VALUES(1, 'Software enginnering 2', 2020);
INSERT INTO Course(courseId, description, year) VALUES(2, 'Computer system security', 2020);
INSERT INTO Course(courseId, description, year) VALUES(3, 'Machine learning and artificial intelligence', 2020);

INSERT INTO User(userId, type, firstName, lastName, email, password) VALUES(4, 'TEACHER', 'Giacomo', 'Poretti', 'giacomo.poretti@agg.it', 'giacomo');
INSERT INTO User(userId, type, firstName, lastName, email, password) VALUES(5, 'TEACHER', 'Marina', 'Massironi', 'marina.massironi@agg.i t', 'marina');

INSERT INTO TeacherCourse(teacherId, courseId, isValid) VALUES(4, 1, 1);
INSERT INTO TeacherCourse(teacherId, courseId, isValid) VALUES(4, 2, 1);
INSERT INTO TeacherCourse(teacherId, courseId, isValid) VALUES(5, 2, 1);

INSERT INTO Enrollment(studentId, courseId) VALUES(1, 1);
INSERT INTO Enrollment(studentId, courseId) VALUES(1, 2);
INSERT INTO Enrollment(studentId, courseId) VALUES(1, 3);
INSERT INTO Enrollment(studentId, courseId) VALUES(2, 3);
INSERT INTO Enrollment(studentId, courseId) VALUES(3, 3);

INSERT INTO Class(classId, description) VALUES(1, '1A');
INSERT INTO Class(classId, description) VALUES(2, '2B');
INSERT INTO Class(classId, description) VALUES(3, '3C');

INSERT INTO Lecture(lectureId, courseId, classId, date) VALUES(1, 1, 1, DATE('now', '+1 day'));
INSERT INTO Lecture(lectureId, courseId, classId, date) VALUES(2, 2, 2, DATE('now', '+1 day'));
INSERT INTO Lecture(lectureId, courseId, classId, date) VALUES(3, 3, 3, DATE('now', '+1 day'));

INSERT INTO Booking(studentId, lectureId) VALUES(1, 3);
INSERT INTO Booking(studentId, lectureId) VALUES(2, 3);
INSERT INTO Booking(studentId, lectureId) VALUES(3, 3);