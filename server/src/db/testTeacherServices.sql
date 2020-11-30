DELETE FROM User;
DELETE FROM Course;
DELETE FROM TeacherCourse;
DELETE FROM Class;
DELETE FROM Lecture;
DELETE FROM Booking;
DELETE FROM Enrollment;
DELETE FROM EmailQueue;

INSERT INTO User(userId, type, firstName, lastName, email, password) VALUES(1, 'STUDENT', 'Aldo', 'Baglio', 'tjw85.student.baglio@inbox.testmail.app', 'aldo');
INSERT INTO User(userId, type, firstName, lastName, email, password) VALUES(2, 'STUDENT', 'Giovanni', 'Storti', 'tjw85.student.storti@inbox.testmail.app', 'giovanni');
INSERT INTO User(userId, type, firstName, lastName, email, password) VALUES(3, 'STUDENT', 'Silvana', 'Fallisi', 'tjw85.student.fallisi@inbox.testmail.app', 'silvana');

INSERT INTO Course(courseId, description, year) VALUES(1, 'Software enginnering 2', 2020);
INSERT INTO Course(courseId, description, year) VALUES(2, 'Computer system security', 2020);
INSERT INTO Course(courseId, description, year) VALUES(3, 'Machine learning and artificial intelligence', 2020);
INSERT INTO Course(courseId, description, year) VALUES(4, 'Web application', 2020);

INSERT INTO User(userId, type, firstName, lastName, email, password) VALUES(4, 'TEACHER', 'Giacomo', 'Poretti', 'tjw85.teacher.poretti@inbox.testmail.app', 'giacomo');
INSERT INTO User(userId, type, firstName, lastName, email, password) VALUES(5, 'TEACHER', 'Marina', 'Massironi', 'tjw85.teacher.massironi@inbox.testmail.app', 'marina');

INSERT INTO TeacherCourse(teacherId, courseId, isValid) VALUES(4, 1, 1);
INSERT INTO TeacherCourse(teacherId, courseId, isValid) VALUES(4, 2, 1);
INSERT INTO TeacherCourse(teacherId, courseId, isValid) VALUES(5, 3, 1);
INSERT INTO TeacherCourse(teacherId, courseId, isValid) VALUES(5, 4, 1);

INSERT INTO Enrollment(studentId, courseId) VALUES(1, 1);
INSERT INTO Enrollment(studentId, courseId) VALUES(1, 2);
INSERT INTO Enrollment(studentId, courseId) VALUES(1, 3);
INSERT INTO Enrollment(studentId, courseId) VALUES(2, 2);
INSERT INTO Enrollment(studentId, courseId) VALUES(3, 3);
INSERT INTO Enrollment(studentId, courseId) VALUES(3, 4);

INSERT INTO Class(classId, description) VALUES(1, '1A');
INSERT INTO Class(classId, description) VALUES(2, '2B');
INSERT INTO Class(classId, description) VALUES(3, '3C');

INSERT INTO Lecture(lectureId, courseId, classId, startingDate, duration, bookingDeadline, delivery) VALUES(1, 1, 1, DATETIME('now', '-1 day', 'start of day', '8 hours', '30 minutes'), 1000*60*90, DATETIME('now', '-2 day', 'start of day', '23 hours', '59 minutes'), 'PRESENCE');
INSERT INTO Lecture(lectureId, courseId, classId, startingDate, duration, bookingDeadline, delivery) VALUES(2, 1, 1, DATETIME('now', '+1 day', 'start of day', '8 hours', '30 minutes'), 1000*60*90, DATETIME('now', 'start of day', '23 hours', '59 minutes'), 'PRESENCE');
INSERT INTO Lecture(lectureId, courseId, classId, startingDate, duration, bookingDeadline, delivery) VALUES(3, 1, 3, DATETIME('now', '+2 day', 'start of day', '8 hours', '30 minutes'), 1000*60*90, DATETIME('now', '1 day', 'start of day', '23 hours', '59 minutes'), 'PRESENCE');
INSERT INTO Lecture(lectureId, courseId, classId, startingDate, duration, bookingDeadline, delivery) VALUES(4, 2, 2, DATETIME('now', '+3 day', 'start of day', '10 hours', '00 minutes'), 1000*60*90, DATETIME('now', '2 day', 'start of day', '23 hours', '59 minutes'), 'PRESENCE');
INSERT INTO Lecture(lectureId, courseId, classId, startingDate, duration, bookingDeadline, delivery) VALUES(5, 3, 3, DATETIME('now', '+4 day', 'start of day', '11 hours', '30 minutes'), 1000*60*90, DATETIME('now', '3 day', 'start of day', '23 hours', '59 minutes'), 'PRESENCE');

INSERT INTO Booking(studentId, lectureId) VALUES(1, 1);
INSERT INTO Booking(studentId, lectureId) VALUES(2, 4);
INSERT INTO Booking(studentId, lectureId) VALUES(3, 5);

INSERT INTO User(userId, type, firstName, lastName, email, password) VALUES(6, 'STUDENT', 'Fake', 'Student', 'tjw85.student.fake@inbox.testmail.app', 'student');
INSERT INTO User(userId, type, firstName, lastName, email, password) VALUES(7, 'TEACHER', 'Fake', 'Teacher', 'tjw85.student.fake@inbox.testmail.app', 'teacher');

DROP trigger IF EXISTS delete_bookings_after_delete_lecture;
CREATE TRIGGER delete_bookings_after_delete_lecture BEFORE DELETE ON Lecture BEGIN INSERT INTO EmailQueue(sender, recipient, emailType, teacherId, studentId, courseId, courseName, lectureId, startingDate) SELECT TempLecture.email, User.email, "LESSON_CANCELLED", TempLecture.teacherId, Booking.studentId, TempLecture.courseId, TempLecture.description, TempLecture.lectureId, TempLecture.startingDate FROM Booking, (SELECT * FROM Lecture, Course, TeacherCourse, User WHERE Lecture.lectureId = OLD.lectureId AND Lecture.courseId = TeacherCourse.courseId AND TeacherCourse.teacherId = User.userId AND Course.courseId = Lecture.courseId) AS TempLecture, User WHERE Booking.lectureId = OLD.lectureId AND Booking.studentId = User.userId AND Booking.lectureId = TempLecture.lectureId; DELETE FROM Booking WHERE Booking.lectureId = OLD.lectureId; END;