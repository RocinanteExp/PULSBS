"use strict";

const { ResponseError } = require("../utils/ResponseError");
const { isValueOfType } = require("../utils/converter");
const { binarySearch } = require("../utils/searchHelper");
const { convertToNumbers } = require("../utils/converter");
const Course = require("../entities/Course");
const Student = require("../entities/Student");
const Teacher = require("../entities/Teacher");
const Lecture = require("../entities/Lecture");
const Email = require("../entities/Email");
const EmailService = require("../services/EmailService");
const Schedule = require("../entities/Schedule");
const db = require("../db/Dao");
const utils = require("../utils/utils");
const fs = require("fs");
const check = require("../utils/checker");

const errno = ResponseError.errno;

// constants
const MODULE_NAME = "SupportOfficerService";
const ACCEPTED_ENTITIES = ["STUDENTS", "COURSES", "TEACHERS", "SCHEDULES", "ENROLLMENTS", "TEACHERCOURSE"];
const DB_TABLES = {
    STUDENTS: {
        name: "User",
        mapTo: ["type", "firstName", "lastName", "email", "ssn", "birthday", "city", "serialNumber", "password"],
        mapFrom: [
            "type",
            "Name",
            "Surname",
            "OfficialEmail",
            "SSN",
            "Birthday",
            "City",
            "Id",
            { func: { name: getDefaultPassword, args: undefined } },
        ],
    },
    TEACHERS: {
        name: "User",
        mapTo: ["type", "firstName", "lastName", "email", "ssn", "serialNumber", "password"],
        mapFrom: [
            "type",
            "GivenName",
            "Surname",
            "OfficialEmail",
            "SSN",
            "Number",
            { func: { name: getDefaultPassword, args: undefined } },
        ],
    },
    COURSES: {
        name: "Course",
        mapTo: ["description", "year", "code", "semester"],
        mapFrom: ["Course", "Year", "Code", "Semester"],
    },
    TEACHERCOURSE: {
        name: "TeacherCourse",
        mapTo: ["teacherId", "courseId", "isValid"],
        mapFrom: [
            { func: { name: getTeacherIdFromSerialNumber, args: ["teacherSSN"] } },
            { func: { name: getCourseIdFromCode, args: ["courseCode"] } },
            { func: { name: getIsValid, args: undefined } },
        ],
    },
    ENROLLMENTS: {
        name: "Enrollment",
        mapTo: ["studentId", "courseId", "year"],
        mapFrom: [
            { func: { name: getStudentIdFromSerialNumber, args: ["Student"] } },
            { func: { name: getCourseIdFromCode, args: ["Code"] } },
            { func: { name: getAAyear, args: undefined } },
        ],
    },
    SCHEDULES: {
        name: "Schedule",
        mapTo: ["code", "AAyear", "semester", "roomId", "seats", "dayOfWeek", "startingTime", "endingTime"],
        mapFrom: [
            "Code",
            { func: { name: getAAyear, args: undefined } },
            { func: { name: getSemester, args: undefined } },
            "Room",
            "Seats",
            "Day",
            { func: { name: getStartingTime, args: ["Time"] } },
            { func: { name: getEndingTime, args: ["Time"] } },
        ],
    },
};

// globals
// TODO: fix race conditions
let allStudentsWithSN = null;
let allTeachersWithSN = null;
let allCoursesWithCode = null;

/**
 * get all courses in the system
 *
 * supportId {Integer}
 * returns {Promise} array of Course's instances. A ResponseError on error.
 **/
async function getCourses(supportId) {
    const { error } = convertToNumbers({ supportId });
    if (error) {
        throw genResponseError(errno.PARAM_NOT_INT, error);
    }

    return await db.getAllCourses();
}

/**
 * get all lecture of a given course
 *
 * supportId {supportId}
 * courseId {courseId}
 * returns {Promise} array of Lecture's instances. A ResponseError on error.
 **/
async function getCourseLectures(supportId, courseId) {
    const { error, courseId: cId } = convertToNumbers({ supportId, courseId });
    if (error) {
        throw genResponseError(errno.PARAM_NOT_INT, error);
    }

    const lectures = await db.getLecturesByCourseAndPeriodOfTime(new Course(cId));

    return lectures;
}

/**
 * Delete a lecture given a lectureId, courseId
 *
 * Only one between teacherId or supportId must be set
 * teacherId {Ingeter|String}
 * supportId {Integer|String}
 * courseId {Integer|String}
 * lectureId {Integer|String}
 * returns {Integer} 204. A ResponseError on error
 **/
async function deleteCourseLecture({ teacherId, supportId }, courseId, lectureId) {
    const requester = teacherId ? { teacherId } : { supportId };
    const isTeacher = teacherId ? true : false;

    const { error, [Object.keys(requester)[0]]: rId, courseId: cId, lectureId: lId } = convertToNumbers({
        ...requester,
        courseId,
        lectureId,
    });
    if (error) {
        throw genResponseError(errno.PARAM_NOT_INT, error);
    }

    if (isTeacher && (!(await check.teacherCourseCorrelation(rId, cId)))) { 
        throw genResponseError(errno.TEACHER_COURSE_MISMATCH_AA, { teacherId: rId, courseId });
    }

    // check if the course has a lecture with id = lId
    if (!(await check.courseLectureCorrelation(cId, lId))) {
        throw genResponseError(errno.COURSE_LECTURE_MISMATCH_AA, { courseId, lectureId });
    }

    const lecture = await db.getLectureById(new Lecture(lId));

    if (check.isLectureCancellable(lecture)) {
        // delete lecture
        const isSuccess = await db.deleteLectureById(lecture);
        if (isSuccess > 0) {
            // send emails to the students that had a booking for the deleted lecture
            const emailsInQueue = await db.getEmailsInQueueByEmailType(Email.EmailType.LESSON_CANCELLED);

            if (emailsInQueue.length > 0) {
                // create template email
                const aEmail = emailsInQueue[0];
                const subjectArgs = [aEmail.courseName];
                const messageArgs = [aEmail.startingDate];
                const { subject, message } = EmailService.getDefaultEmail(
                    Email.EmailType.LESSON_CANCELLED,
                    subjectArgs,
                    messageArgs
                );

                const recipients = emailsInQueue.map((email) => email.recipient);
                sendEmailsTo(subject, message, recipients);
            }
        }
    } else {
        throw genResponseError(errno.LECTURE_NOT_CANCELLABLE, { lectureId: lecture.lectureId });
    }

    return 204;
}

/**
 * Update a lecture delivery mode given a lectureId, courseId and a switchTo mode
 * The switch is possible only if the request is sent 30m before the scheduled starting time.
 *
 * supportId {Integer}
 * courseId {Integer}
 * lectureId {Integer}
 * switchTo {String} Admissible values {"remote" | "presence" }
 * returns {Integer} 204. In case of error an ResponseError
 **/
async function updateCourseLecture(supportId, courseId, lectureId, switchTo) {
    const { error, courseId: cId, lectureId: lId } = convertToNumbers({ supportId, courseId, lectureId });
    if (error) {
        throw genResponseError(errno.PARAM_NOT_INT, error);
    }

    // check if switchTo mode is admissible
    if (!check.isValidDeliveryMode(switchTo)) {
        throw genResponseError(errno.LECTURE_INVALID_DELIVERY_MODE, { delivery: switchTo });
    }

    // check if the course has a lecture with id = lId
    if (!(await check.courseLectureCorrelation(cId, lId))) {
        throw genResponseError(errno.COURSE_LECTURE_MISMATCH_AA, { courseId, lectureId });
    }

    const lecture = await db.getLectureById(new Lecture(lId));

    // check if the request was sent 30m prior the start of the lecture
    if (!check.isLectureSwitchable(lecture, switchTo, new Date(), false)) {
        throw genResponseError(errno.LECTURE_NOT_SWITCHABLE, { lectureId });
    }

    // do nothing if the lecture delivery mode is already in that state
    if (lecture.delivery === switchTo.toUpperCase()) return 204;

    lecture.delivery = switchTo;
    await db.updateLectureDeliveryMode(lecture);

    // notify the students that have a booking for this lecture
    const studentsToBeNotified = await db.getBookedStudentsByLecture(lecture);
    if (studentsToBeNotified.length > 0) {
        const course = await db.getCourseByLecture(lecture);

        const subjectArgs = [course.description];
        const messageArgs = [utils.formatDate(lecture.startingDate), lecture.delivery];

        const { subject, message } = EmailService.getDefaultEmail(
            Email.EmailType.LESSON_UPDATE_DELIVERY,
            subjectArgs,
            messageArgs
        );

        const recipientsEmails = studentsToBeNotified.map((obj) => obj.student.email);
        sendEmailsTo(subject, message, recipientsEmails);
    }

    return 204;
}

/**
 * entrypoint for the routes **\/:supportId\/uploads
 *
 * entities {Array} of Objects. Es. [{}, {}] for the list of properties of a object look at .csv files at https://softeng.polito.it/courses/SE2/PULSeBS_Stories.html
 * path {Integer} relative or absolute path of the endpoint. Es. ./schedules
 *
 * returns {Integer} 204. A ResponseError on error
 **/
async function manageEntitiesUpload(entities, path) {
    let entityType = getEntityNameFromPath(path);
    if (entityType === undefined) {
        throw genResponseError(errno.ENTITY_TYPE_NOT_VALID, { type: path });
    }

    //console.time("phase: mapping");
    // map each entry of entities as a new object with the properties defined in DB_TABLES[<entityType>].mapTo
    const sanitizedEntities = await sanitizeEntities(entities, entityType);
    //console.timeEnd("phase: mapping");

    //console.time("phase: query gen");
    // create the queries
    const sqlQueries = genSqlQueries("INSERT", entityType, sanitizedEntities);
    //console.timeEnd("phase: query gen");

    //console.time("phase: query run");
    // run the queries
    await runBatchQueries(sqlQueries);
    //console.timeEnd("phase: query run");

    // check if we need to do any more processing,
    // i.e. when uploading the schedules we need to also generate the lectures
    // i.e. when uploading the courses we need to also update the TeacherCourse table
    if (needAdditionalSteps(entityType)) {
        return await callNextStep(entityType, entities, sanitizedEntities);
    }

    return 204;
}

function needAdditionalSteps(currStep) {
    if (currStep === "COURSES" || currStep === "SCHEDULES") {
        return true;
    }

    return false;
}

/**
 * do more processing
 *
 * currStep {String} the previous step, i.e. the entity type
 * args {Array} of Object. args[0] is the uploaded entities, args[1] are the sanitized entities
 *
 * returns {Integer} 204. A ResponseError on error
 **/
async function callNextStep(currStep, ...args) {
    switch (currStep) {
        case "COURSES": {
            return await manageEntitiesUpload(args[0], "/teachercourse");
        }
        case "SCHEDULES": {
            // create each sanitized entity to a Schedule
            const schedules = args[1].map((arg) => {
                const schedule = new Schedule(undefined, ...Object.values(arg));
                schedule.seats = Number(schedule.seats);
                return schedule;
            });

            try {
                console.log("calling _generateLecturesBySchedule");
                console.log(schedules[0]);
                await db._generateLecturesBySchedule(schedules[0], db.DaoHint.NEW_VALUE);
            } catch (err) {
                console.log("sono catch di callNextStep");
                console.log(err);
                throw err;
            }

            break;
        }
        default: {
            console.log("callNextStep", currStep, "not implemented");
        }
    }
}

/**
 * map each entry of entities as a new object with the properties defined in DB_TABLES[<entityType>].mapTo
 * entities {Array} of Objects. Es. [{}, {}] for the list of properties of a object look at .csv files at https://softeng.polito.it/courses/SE2/PULSeBS_Stories.html
 * entityType {String} look at ACCEPTED_ENTITIES
 *
 * returns {Promise} array of Object's instances. A ResponseError on error
 **/
async function sanitizeEntities(entities, entityType) {
    switch (entityType) {
        case "STUDENTS": {
            return sanitizeUserEntities(entities, entityType);
        }
        case "TEACHERS": {
            return sanitizeUserEntities(entities, entityType);
        }
        case "COURSES": {
            return sanitizeGenericEntities(entities, entityType);
        }
        case "ENROLLMENTS": {
            return await sanitizeEnrollmentsEntities(entities, entityType);
        }
        case "SCHEDULES": {
            return sanitizeGenericEntities(entities, entityType);
        }
        case "TEACHERCOURSE": {
            return await sanitizeTeacherCourseEntities(entities, entityType);
        }
    }
}

/**
 * Search in the array an entity that has the target value in the propertyName
 */
function findEntity(array, target, propertyName) {
    const index = binarySearch(array, target, propertyName);
    if (index === -1) {
        throw genResponseError(errno.ENTITY_NOT_FOUND, { type: target });
    }

    return array[index];
}

function getTeacherIdFromSerialNumber(serialNumber) {
    const teacher = findEntity(allTeachersWithSN, serialNumber, "serialNumber");

    return teacher.teacherId;
}

function getStudentIdFromSerialNumber(serialNumber) {
    const student = findEntity(allStudentsWithSN, serialNumber, "serialNumber");

    return student.studentId;
}

function getCourseIdFromCode(code) {
    const course = findEntity(allCoursesWithCode, code, "code");

    return course.courseId;
}

function getIsValid() {
    return 1;
}

function getDefaultPassword() {
    return "foo";
}

function getAAyear() {
    return 2020;
}

function getSemester() {
    return 1;
}

/**
 * extract the starting time. Es. from 14:30-16:00 it will return 14:30
 * @param {String} orario. Es. 14:30-16:00
 * @returns {String} es. 14:00
 */
function getStartingTime(orario) {
    const regex = /[0-9]+/g;
    const match = orario.match(regex);
    return `${match[0]}:${match[1]}:00`;
}

/**
 * extract the ending time. Es. from 14:30-16:00 it will return 16:00
 * @param {String} orario. Es. 14:30-16:00
 * @returns {String} es. 16:00
 */
function getEndingTime(orario) {
    const regex = /[0-9]+/g;
    const match = orario.match(regex);
    return `${match[2]}:${match[3]}:00`;
}

/**
 * get the mapFrom and mapTo properties of DB_TABLES
 * @param {String} entityType. See ACCEPTED_ENTITIES.
 * @returns {Object} with 2 properties: mapFrom and mapTo
 */
function sanitizeUserEntities(users, entityType) {
    const { mapFrom, mapTo } = getFieldsMapping(entityType);

    return users.map((u) => {
        // add to a user the field type. In our case it would be either TEACHER or STUDENT
        // we slice to take out the ending s. See ACCEPTED_ENTITIES
        u.type = entityType.slice(0, entityType.length - 1);

        return applyAction(u, mapFrom, mapTo);
    });
}

/**
 * Apply the actions defined in the mapFrom to each entity
 * @param {Array} entities.
 * @param {String} entityType. See ACCEPTED_ENTITIES.
 * @returns {Promise} Array of sanitized entities
 */
function getFieldsMapping(entityType) {
    const mapFrom = DB_TABLES[entityType].mapFrom;
    const mapTo = DB_TABLES[entityType].mapTo;

    return { mapFrom, mapTo };
}

/**
 * Apply the actions defined in the mapFrom to each entity
 * @param {Array} entities.
 * @param {String} entityType. See ACCEPTED_ENTITIES.
 * @returns {Array} of sanitized entities
 */
function sanitizeGenericEntities(entities, entityType) {
    const { mapFrom, mapTo } = getFieldsMapping(entityType);

    return entities.map((entity) => applyAction(entity, mapFrom, mapTo));
}

/**
 * update a global array using the comparator
 * @param {String} who
 */
async function updateAndSort(who, comparator) {
    switch (who) {
        case "STUDENT": {
            allStudentsWithSN = await db.getAllStudents();
            allStudentsWithSN = allStudentsWithSN.filter((student) => student.serialNumber !== null);
            allStudentsWithSN.sort(comparator);
            break;
        }
        case "TEACHER": {
            allTeachersWithSN = await db.getAllTeachers();
            allTeachersWithSN = allTeachersWithSN.filter((teacher) => teacher.serialNumber !== null);
            allTeachersWithSN.sort(comparator);
            break;
        }
        case "COURSE": {
            allCoursesWithCode = await db.getAllCourses();
            allCoursesWithCode = allCoursesWithCode.filter((course) => course.code !== null);
            allCoursesWithCode.sort(comparator);
            break;
        }
    }
}

/**
 * Apply the actions defined in the mapFrom to each entity
 * @param {Array} entities.
 * @param {String} entityType. See ACCEPTED_ENTITIES.
 * @returns {Promise} array of sanitized entities
 */
async function sanitizeEnrollmentsEntities(enrollments, entityType) {
    await updateAndSort("STUDENT", Student.getComparator("serialNumber"));
    await updateAndSort("COURSE", Course.getComparator("code"));

    const { mapFrom, mapTo } = getFieldsMapping(entityType);
    return enrollments.map((entity) => applyAction(entity, mapFrom, mapTo));
}

function applyAction(entity, mapFrom, mapTo) {
    const ret = {};

    for (let i = 0; i < mapFrom.length; i++) {
        if (isValueOfType("string", mapFrom[i])) {
            ret[mapTo[i]] = entity[mapFrom[i]];
        } else {
            const func = mapFrom[i].func.name;
            let args = mapFrom[i].func.args;

            if (args === undefined) {
                ret[mapTo[i]] = func();
            } else {
                args = args.map((arg) => entity[arg]);
                ret[mapTo[i]] = func(...args);
            }
        }
    }

    return ret;
}

/**
 * get the mapFrom and mapTo properties of DB_TABLES
 * @param {String} entityType. See ACCEPTED_ENTITIES.
 * @returns {Promise} array of Objects
 */
async function sanitizeTeacherCourseEntities(entities, entityType) {
    await updateAndSort("TEACHER", Teacher.getComparator("serialNumber"));
    await updateAndSort("COURSE", Course.getComparator("code"));

    const { mapFrom, mapTo } = getFieldsMapping(entityType);

    return entities.map((entity) => {
        let tc = {};
        tc.teacherSSN = entity.Teacher;
        tc.courseCode = entity.Code;
        return applyAction(tc, mapFrom, mapTo);
    });
}

function logToFile(queries) {
    let date = new Date();

    fs.appendFile("./queries.log", `\n${date.toISOString()}\n`, function (err) {
        if (err) return console.log(err);
    });

    fs.appendFile("./queries.log", queries.join("\n"), function (err) {
        if (err) return console.log(err);
    });
}

async function runBatchQueries(sqlQueries) {
    try {
        await db.execBatch(sqlQueries);
        logToFile(sqlQueries);
    } catch (err) {
        console.log("runBatchQueries");
        console.log(err);
        throw genResponseError(errno.DB_GENERIC_ERROR, { msg: err.toString() });
    }
}

/**
 * transform a db row into a specific type of user
 * @param {Object} row
 * @returns {User|Teacher|Manager|Support} specific user
 */
function genSqlQueries(queryType, entityType, entities, maxQuery) {
    switch (queryType) {
        case "INSERT": {
            const queriesArray = genInsertSqlQueries(entityType, entities);
            return queriesArray;
        }
        case "DELETE":
        case "UPDATE":
        default: {
            console.log(`${queryType} not implemented in genSqlQueries`);
            break;
        }
    }
}

/**
 * create an array of "insert sql query" given an entityType and a set of entities
 * @param {String} see ACCEPTED_ENTITIES
 * @param {Array} of Object
 * @returns {Array} of string
 */
function genInsertSqlQueries(entityType, entities) {
    const table = DB_TABLES[entityType];
    const queryTemplate = `INSERT INTO ${table.name}(${table.mapTo.join(", ")}) VALUES`;

    const queries = entities.map(
        (entity) =>
            queryTemplate +
            "(" +
            Object.values(entity)
                .map((field) => `"${field}"`)
                .join(", ") +
            ");"
    );

    return queries;
}

/**
 * find the entity name from the path
 * @param {String} path. Es. /1/uploads/students
 * @returns {String | undefined}. Returns STUDENTS
 */
function getEntityNameFromPath(path) {
    const tokens = path.split("/");
    const possibleEntity = tokens[tokens.length - 1].toUpperCase();

    const ret = ACCEPTED_ENTITIES.find((entity) => entity === possibleEntity);

    return ret;
}

function genResponseError(nerror, error) {
    return new ResponseError(MODULE_NAME, nerror, error);
}

function sendEmailsTo(subject, message, recipientsEmails = []) {
    for (const email of recipientsEmails) {
        EmailService.sendCustomMail(email, subject, message)
            .then(() => {
                console.email(`recepient: ${email}; subject: ${subject}`);
            })
            .catch((err) => console.error(err));
    }
}

/**
 * write object to file
 * @param {Object}
 */
function writeToFile(obj, path = "./input/schedules.json") {
    fs.writeFile(path, JSON.stringify(obj), (err) => {
        if (err) console.log("an error occured");
    });
}

/**
 * get the list of schedules
 * @param {Object} param - supportId
 * @returns {Array} array of Schedule
 */
const supportOfficerGetSchedules = async function supportOfficerGetSchedules({ managerId }) {
    const schedules = await db.getSchedules();
    return schedules;
};

/**
 * update an existing schedule
 * @param {Object} param - supportId, scheduleId, schedule
 * @returns {Array} array of Schedule
 */
const supportOfficerUpdateSchedule = async function supportOfficerUpdateSchedule({ managerId, scheduleId, schedule }) {
    scheduleId = Number(scheduleId);
    schedule.scheduleId = scheduleId;

    // check if it exists
    const schedules = db.getSchedules();
    const actualSchedules = schedules.filter((s) => s.scheduleId === schedule.scheduleId);
    if (actualSchedules.length === 0) {
        throw StandardErr.new("ManagerService", StandardErr.errno.NOT_EXISTS, "This schedule does not exist", 404);
    }

    await db.updateSchedule(schedule);
    return;
};

const supportOfficerGetRooms = async function supportOfficerGetRooms({ managerId }) {
    const rooms = await db.getClasses();
    return rooms;
};

const privateFunc = { getEntityNameFromPath, genInsertSqlQueries, updateAndSort };

module.exports = {
    manageEntitiesUpload,
    privateFunc,
    getCourses,
    getCourseLectures,
    deleteCourseLecture,
    updateCourseLecture,
    supportOfficerGetSchedules,
    supportOfficerUpdateSchedule,
    supportOfficerGetRooms,
};
