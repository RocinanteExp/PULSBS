import React from 'react';
import Container from "react-bootstrap/Container"
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Spinner from 'react-bootstrap/Spinner';
import Badge from 'react-bootstrap/Badge';
import moment from 'moment';
import API from "../api/Api";
import { CoursePanel, LecturePanel, StudentPanel, EditModal, DeleteModal, ErrorModal } from '../components/TeacherComp';
import Lecture from '../entities/lecture';

/**
 *  elementForPage is a configuration parameter to limit the number of entries of the tables showing courses/lectures/students
 *  in the same instance (min value: 2)
 */

class TeacherPage extends React.Component {

    /**
     * TeacherPage constructor
     * @param {User} props 
     */
    constructor(props) {
        super(props);
        this.state = {
            user: props.user,
            courses: [], lectures: [], students: [], presentStudents: [],    //elements
            selectedCourse: null, selectedLecture: null,                     //selected elements
            lectureIdToUpdate: null, deliveryToUpdate: null,                 //change lecture delivery 
            lectureIdToDelete: null,                                         //delete lecture
            currCPage: 1,                                                    //course pagination
            currLPage: 1,                                                    //lecture pagination
            currSPage: 1,                                                    //student pagination
            fetchErrorC: false, fetchErrorL: false, fetchErrorS: false,      //fetch errors
            lectureLoading: false, studentLoading: false                     //loadings
        };
    }

    /**
     * componentDidMount fetches the all courses of the teacher 
     */
    componentDidMount() {
        let courses = this.props.courses;
        let fetchError = this.props.fetchError;
        if (fetchError)
            this.setState({ fetchErrorC: fetchError });
        else {
            this.setState({ courses: courses });
        }
    }

    /**
     * updateLectures fetches all lectures of the selected teacher's course 
     */
    updateLectures = (courseId) => {
        this.setState({ lectureLoading: true });
        let now = moment().subtract(1, 'hour').subtract(30, 'minutes').toISOString();
        API.getLecturesByCourseIdByTeacherId(this.state.user.userId, courseId, now)
            .then((lectures) => {
                this.setState({ lectures: lectures, selectedCourse: courseId, selectedLecture: null, fetchErrorL: false, students: [], presentStudents: [], fetchErrorS: false, lectureLoading: false, currLPage: 1 });
            })
            .catch((error) => {
                let errormsg = error.source + " : " + error.error;
                this.setState({ selectedCourse: courseId, lectures: [], selectedLecture: null, fetchErrorL: errormsg, students: [], presentStudents: [], fetchErrorS: false, lectureLoading: false, currLPage: 1 });
            });
    }

    /**
     * updateStudents fetches all students of the selected lecture of a teacher's selected course 
     */
    updateStudents = (lectureId) => {
        this.setState({ studentLoading: true });
        API.getStudentsByLecture(this.state.user.userId, this.state.selectedCourse, lectureId, true)
            .then((students) => {
                let presents = students.slice().filter(a => a.bookingStatus === 'PRESENT');
                this.setState({ students: students, presentStudents: presents, selectedLecture: lectureId, fetchErrorS: false, studentLoading: false, currSPage: 1 })
            })
            .catch((error) => {
                let errormsg = error.source + " : " + error.error;
                this.setState({ selectedLecture: lectureId, students: [], presentStudents: [], fetchErrorS: errormsg, studentLoading: false, currSPage: 1 });
            });
    }

    /**
     * resetSelected lets to reset the selected course/lecture (and related states)
     */
    resetSelected = (type) => {
        switch (type) {
            case "course":
                this.setState({ selectedCourse: null, lectures: [], selectedLecture: null, lPages: 1, fetchErrorL: false, students: [], presentStudents: [], fetchErrorS: false })
                break;
            case "lecture":
                this.setState({ selectedLecture: null, students: [], presentStudents: [], fetchErrorS: false });
                break;
        }
    }

    changePage = (name, number) => {
        if (number)
            if (name === "currCPage")
                this.setState({ currCPage: number });
            else if (name === "currLPage")
                this.setState({ currLPage: number });
            else
                this.setState({ currSPage: number });
    }

    //Error handler
    closeError = (errorName) => {
        this.setState({ [errorName]: false });
    }

    // EditModal handlers
    showEditModal = (lectureId, delivery) => {
        this.setState({ lectureIdToUpdate: lectureId, deliveryToUpdate: delivery });
    }

    // EditModal handlers
    showDeleteModal = (lectureId) => {
        this.setState({ lectureIdToDelete: lectureId });
    }

    closeEditModal = () => {
        this.setState({ lectureIdToUpdate: null, deliveryToUpdate: null });
    }

    closeDeleteModal = () => {
        this.setState({ lectureIdToDelete: null });
    }

    updateDelivery = () => {
        var deliveryToUpdate = this.state.deliveryToUpdate;
        var newDel = deliveryToUpdate === 'PRESENCE' ? 'REMOTE' : 'PRESENCE';
        API.updateDeliveryByLecture(this.state.user.userId, this.state.selectedCourse, this.state.lectureIdToUpdate, newDel)
            .then(() => {
                //ok from server
                var newLectures = this.state.lectures.slice();
                var newLecture, i;
                var lectureIdToUpdate = this.state.lectureIdToUpdate;
                newLectures.forEach(function (item, index) {
                    if (item.lectureId === parseInt(lectureIdToUpdate)) {
                        newLecture = new Lecture(item.lectureId, item.courseId, item.classId, item.startingDate, item.duration, item.bookingDeadline, newDel);
                        i = index;
                    }
                });
                newLectures.splice(i, 1, newLecture);
                this.setState({ lectures: newLectures, lectureIdToUpdate: null, deliveryToUpdate: null });
            }).catch((error) => {
                //!ok from server
                let errormsg = error.source + " : " + error.error;
                this.setState({ fetchErrorL: errormsg, lectureIdToUpdate: null, deliveryToUpdate: null });
            });
    }

    deleteLecture = () => {
        API.deleteLecture(this.state.user.userId, this.state.selectedCourse, this.state.lectureIdToDelete)
            .then(() => {
                //ok from server
                var newLectures = this.state.lectures.slice();
                var i;
                var lectureIdToDelete = this.state.lectureIdToDelete;
                newLectures.forEach(function (item, index) {
                    if (item.lectureId === parseInt(lectureIdToDelete)) {
                        i = index;
                    }
                });
                newLectures.splice(i, 1);
                if (lectureIdToDelete === this.state.selectedLecture) {
                    this.setState({ lectures: newLectures, lectureIdToDelete: null, selectedLecture: null, students: [], presentStudents: [] });
                }
                else {
                    this.setState({ lectures: newLectures, lectureIdToDelete: null });
                }
            }).catch((error) => {
                //!ok from server
                let errormsg = error.source + " : " + error.error;
                this.setState({ fetchErrorL: errormsg, lectureIdToDelete: null });
            });

    }

    updateStudent = (student) => {
        //check: is student already signed present?
        let students = this.state.students;
        let presents = this.state.presentStudents.slice();
        let newStatus = presents.indexOf(student) === -1 ? "present" : "not_present";
        API.updateStudentStatus(this.state.user.userId, this.state.selectedCourse, this.state.selectedLecture, student.studentId, newStatus)
            .then(() => {
                //ok from server
                let j = students.indexOf(student);
                if (newStatus === "present") {
                    presents.push(student);
                    students[j].bookingStatus = "PRESENT";
                }
                else {
                    let i = presents.indexOf(student);
                    presents.splice(i, 1);
                    students[j].bookingStatus = "NOT_PRESENT";
                }
                this.setState({ students: students, presentStudents: presents });
            })
            .catch((error) => {
                //!ok from server
                let errormsg = error.source + " : " + error.error;
                this.setState({ fetchErrorS: errormsg });
            });
    }

    render() {
        let takeAttendances = false;
        if (!this.state.lectureLoading) {
            let selectedLecture = this.state.selectedLecture;
            if (selectedLecture) {
                let lecture = null;
                this.state.lectures.forEach(function (item) {
                    if (item.lectureId === parseInt(selectedLecture))
                        lecture = item;
                });
                takeAttendances = moment().isBetween(moment(lecture.startingDate), moment(lecture.startingDate).add(lecture.duration, "milliseconds")) ? true : false;
            }
        }

        let space = <><h5>{" "}</h5>
            <br />
            <br />
            <br /></>;

        let presentStudents_ = this.state.presentStudents;
        if (this.state.selectedLecture && takeAttendances)
            presentStudents_.sort((a, b) => a.studentId - b.studentId);

        return (
            <>
                { this.state.lectureIdToUpdate &&
                    <EditModal editClose={this.closeEditModal} lectureId={this.state.lectureIdToUpdate} delivery={this.state.deliveryToUpdate} updateDelivery={this.updateDelivery} />}
                { this.state.lectureIdToDelete &&
                    <DeleteModal deleteClose={this.closeDeleteModal} lectureId={this.state.lectureIdToDelete} deleteLecture={this.deleteLecture} />}
                {this.state.fetchErrorC && <ErrorModal name="fetchErrorC" error={this.state.fetchErrorC} close={this.closeError} />}
                {this.state.fetchErrorS && <ErrorModal name="fetchErrorS" error={this.state.fetchErrorS} close={this.closeError} />}
                {this.state.fetchErrorL && <ErrorModal name="fetchErrorL" error={this.state.fetchErrorL} close={this.closeError} />}
                <Container fluid>
                    <Row>
                        <Col sm={6}>
                            {space}
                            <CoursePanel
                                courses={this.state.courses} sCourse={this.state.selectedCourse}                                //courses
                                currentPage={this.state.currCPage} change={this.changePage}                                     //pagination
                                update={this.updateLectures} reset={this.resetSelected}                                         //interaction with Lecture Panel
                            />


                        </Col>
                        <Col sm={6}>
                            {this.state.selectedLecture && <>
                                {takeAttendances ? <><h5><Badge variant="success">In progress</Badge></h5>Lecture in progress, click on a student to sign his presence/absence to the lecture.<br /><br /></> : space}
                                <StudentPanel
                                    students={this.state.students}                                                      //students
                                    currentPage={this.state.currSPage} change={this.changePage}                         //pagination
                                    updateStudent={this.updateStudent} enable={takeAttendances}                         //student presence manag
                                    present={false}
                                />
                                <br />

                            </>}

                        </Col>
                    </Row>
                    <br />
                    <br />
                    <Row>
                        <Col sm={6}>
                            {this.state.selectedCourse && <LecturePanel
                                lectures={this.state.lectures} sLecture={this.state.selectedLecture}                                //lectures
                                currentPage={this.state.currLPage} change={this.changePage}                                         //pagination
                                update={this.updateStudents} reset={this.resetSelected}                                             //interaction with StudentPanel                                                 
                                showEditModal={this.showEditModal}                                                                  //EditDelivery management                                                                     
                                showDeleteModal={this.showDeleteModal}                                                              //Delete
                            />}
                        </Col>
                        <Col sm={6}>
                            {this.state.selectedLecture && takeAttendances &&
                                <StudentPanel
                                    students={presentStudents_}                                                         //present students
                                    currentPage={this.state.currSPage} change={this.changePage}                         //pagination
                                    updateStudent={this.updateStudent} enable={false}                                   //student presence manag
                                    present={true} numStudents={this.state.students.length}
                                />
                            }
                            <Col sm={4}>

                            </Col>
                        </Col>
                    </Row>
                    {(this.state.studentLoading || this.state.lectureLoading) && <label className="teacher-loading">Loading...&emsp;&emsp;<Spinner animation="border" /></label>}
                </Container>
            </>
        );
    }
}

export default TeacherPage;
