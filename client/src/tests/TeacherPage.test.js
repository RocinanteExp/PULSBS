import { render, screen, act } from '@testing-library/react';
import fetchMock from "jest-fetch-mock";
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/extend-expect';
import moment from "moment";

import TeacherPage from '../pages/TeacherPage';
import User from '../entities/user';
import Course from '../entities/course';
import Lecture from '../entities/lecture';
import Student from '../entities/student';

fetchMock.enableMocks();

const teacher = new User(1, "TEACHER", "Giacomo", "Poretti", "giacomo.poretti@agg.it", "giacomo");
const courses = [
  new Course(1, "Software Engineering 2", 2020),
  new Course(2, "Information Systems Security", 2020),
  new Course(3, "Architetture dei Sistemi di Elaborazione", 2020),
  new Course(4, "Data Science e Tecnologie per le Basi di Dati", 2020),
  new Course(5, "Programmare in React", 2020)
];
const lectures = [
  { lecture: new Lecture(1, 1, 1, moment().add("1", "day").toISOString(), "1000000", moment().toISOString(), "PRESENCE") },
  { lecture: new Lecture(2, 1, 1, moment().add("2", "day").toISOString(), "1000000", moment().add("1", "day").toISOString(), "REMOTE") },
  { lecture: new Lecture(3, 2, 2, moment().add("1", "day").toISOString(), "1000000", moment().toISOString(), "PRESENCE") },
  { lecture: new Lecture(4, 1, 2, moment().subtract("10", "minutes").toISOString(), "1000000", moment().toISOString(), "PRESENCE") },
  { lecture: new Lecture(5, 1, 2, moment().add("1", "day").toISOString(), "1000000", moment().toISOString(), "PRESENCE") }
];
const students = [
  { student: new Student(1, "Francesco", "Rossi", "fr@email.com", "ciao1") },
  { student: new Student(2, "Monica", "Gialli", "mg@email.com", "ciao2") },
  { student: new Student(3, "Giovanni", "Verdi", "fr@email.com", "ciao1") },
  { student: new Student(4, "Carla", "Blu", "mg@email.com", "ciao2") },
  { student: new Student(5, "Francesco", "Rossi", "fr@email.com", "ciao1") },
  { student: new Student(6, "Monica", "Gialli", "mg@email.com", "ciao2") },
  { student: new Student(7, "Giovanni", "Verdi", "fr@email.com", "ciao1") },
  { student: new Student(8, "Carla", "Blu", "mg@email.com", "ciao2") },
  { student: new Student(9, "Francesco", "Rossi", "fr@email.com", "ciao1") },
  { student: new Student(10, "Monica", "Gialli", "mg@email.com", "ciao2") },
  { student: new Student(11, "Giovanni", "Verdi", "fr@email.com", "ciao1") },
  { student: new Student(12, "Carla", "Blu", "mg@email.com", "ciao2") }
];

beforeEach(() => {
  fetch.resetMocks();
});

async function fetchCourses(error) {
  if (error)
    await act(async () => {
      render(<TeacherPage user={teacher} fetchError={error} />);
    });
  else
    await act(async () => {
      render(<TeacherPage user={teacher} courses={courses} />);
    });
}

async function fetchLectureSuccess() {
  await fetchCourses();
  let res = JSON.stringify(lectures);
  fetch.mockResponseOnce(res);
  await act(async () => {
    userEvent.click(screen.getByTestId('c-1'))
  });

}

async function fetchStudentSuccess() {
  await fetchLectureSuccess();
  let res = JSON.stringify(students);
  fetch.mockResponseOnce(res);
  await act(async () => {
    userEvent.click(screen.getByTestId('l-1'))
  });
}

async function setupEditModal() {
  await fetchLectureSuccess();
  await act(async () => {
    userEvent.click(screen.getByTestId('m-1'))
  });
}

async function setupDeleteModal() {
  await fetchLectureSuccess();
  await act(async () => {
    userEvent.click(screen.getByTestId('d-1'))
  });
}

async function setupStudentUpdate() {
  await fetchLectureSuccess();
  let res = JSON.stringify(students);
  fetch.mockResponseOnce(res);
  await act(async () => {
    userEvent.click(screen.getByTestId('l-4'));
  });
}

describe('Teacher Page suite', () => {
  test('render TeacherPage component (courses API : success), testing pagination', async () => {
    await fetchCourses();
    let items = screen.getAllByTestId('course-row');
    expect(items).toHaveLength(4);
    expect(screen.getByText("Software Engineering 2")).toBeInTheDocument(); //should be in page 0
    await act(async () => {
      userEvent.click(screen.getByTestId('paginationItemCourse-2')); //page 1 -> 2
    });
    expect(screen.getByText("Programmare in React")).toBeInTheDocument(); //should be in page 1
    await act(async () => {
      userEvent.click(screen.getByTestId('paginationItemCourse-1')); //page 2 -> 1
    });
    expect(screen.getByText("Information Systems Security")).toBeInTheDocument(); //should be in page 0
  });

  test('render TeacherPage component (courses API : json parsing error)', async () => {
    await fetchCourses('Course : application parse error');
    expect(screen.getByText('Course : application parse error')).toBeInTheDocument();
    await act(async () => {
      userEvent.click(screen.getByTestId('errorClose'));
    });
  });

  test('render TeacherPage component (courses API : error)', async () => {
    await fetchCourses('Course : invalid parameter error');
    expect(screen.getByText('Course : invalid parameter error')).toBeInTheDocument();
  });

  test('render TeacherPage component (courses API : error parsing error)', async () => {
    await fetchCourses('Course : server error');
    expect(screen.getByText('Course : server error')).toBeInTheDocument();
  });

  test('render TeacherPage component (courses API : server connection error)', async () => {
    await fetchCourses('Course : server error');
    expect(screen.getByText('Course : server error')).toBeInTheDocument();
  });

  test('testing interaction CoursePanel-LecturePanel (lectures API : success), testing pagination', async () => {
    await fetchLectureSuccess();
    expect(screen.getByTestId("selected-course")).toBeInTheDocument();
    const items = screen.getAllByTestId('lecture-row');
    expect(items).toHaveLength(4);
    await act(async () => {
      userEvent.click(screen.getByTestId('paginationItemLecture-2')); //page 1 -> 2
    });
    await act(async () => {
      userEvent.click(screen.getByTestId('paginationItemLecture-1')); //page 2 -> 1
    });
    await act(async () => {
      userEvent.click(screen.getByTestId('c-1'))
    });
  });

  test('testing interaction CoursePanel-LecturePanel (lectures API : json parsing error)', async () => {
    await fetchCourses();
    let res = JSON.stringify();
    fetch.mockResponseOnce(res);
    await act(async () => {
      userEvent.click(screen.getByTestId('c-1'))
    });
    expect(screen.getByTestId("selected-course")).toBeInTheDocument();
    expect(screen.getByText('Lecture : application parse error')).toBeInTheDocument();
  });

  test('testing interaction CoursePanel-LecturePanel (lectures API : error)', async () => {
    await fetchCourses();
    fetch.mockResponseOnce(JSON.stringify([{
      source: "TeacherService",
      errno: 1,
      error: "'teacherId' parameter is not an integer: fail",
      statusCode: 400
    }]), { status: 400 });
    await act(async () => {
      userEvent.click(screen.getByTestId('c-1'))
    });
    expect(screen.getByTestId("selected-course")).toBeInTheDocument();
    expect(screen.getByText('Lecture : invalid parameter error')).toBeInTheDocument();
  });

  test('testing interaction CoursePanel-LecturePanel (lectures API : error parsing error)', async () => {
    await fetchCourses();
    fetch.mockResponseOnce(JSON.stringify(), { status: 400 });
    await act(async () => {
      userEvent.click(screen.getByTestId('c-1'))
    });
    expect(screen.getByTestId("selected-course")).toBeInTheDocument();
    expect(screen.getByText('Lecture : server error')).toBeInTheDocument();
  });

  test('testing interaction CoursePanel-LecturePanel (lectures API : server connection error)', async () => {
    await fetchCourses();
    fetch.mockRejectOnce();
    await act(async () => {
      userEvent.click(screen.getByTestId('c-1'))
    });
    expect(screen.getByTestId("selected-course")).toBeInTheDocument();
    expect(screen.getByText('Lecture : server error')).toBeInTheDocument();
  });

  test('testing interaction between LecturePanel-StudentPanel (students API : success), testing pagination', async () => {
    await fetchStudentSuccess();
    expect(screen.getByTestId("selected-course")).toBeInTheDocument();
    expect(screen.getByTestId("number-students-12")).toBeInTheDocument();
    let items = screen.getAllByTestId('student-row');
    expect(items).toHaveLength(4);
    await act(async () => {
      userEvent.click(screen.getByTestId('paginationItemStudent-2')); //page 1 -> 2
    });
    items = screen.getAllByTestId('student-row');
    expect(items).toHaveLength(4);
    await act(async () => {
      userEvent.click(screen.getByTestId('paginationItemStudent-1')); //page 2 -> 1
    });
    await act(async () => {
      userEvent.click(screen.getByTestId('l-1'))
    });
  });

  test('testing interaction between LecturePanel-StudentPanel (students API : json parsing error)', async () => {
    await fetchLectureSuccess();
    let res = JSON.stringify();
    fetch.mockResponseOnce(res);
    await act(async () => {
      userEvent.click(screen.getByTestId('l-1'))
    });
    expect(screen.getByTestId("selected-lecture")).toBeInTheDocument();
    expect(screen.getByText('Student : application parse error')).toBeInTheDocument();
  });

  test('testing interaction between LecturePanel-StudentPanel (students API : error)', async () => {
    await fetchLectureSuccess();
    fetch.mockResponseOnce(JSON.stringify([{
      source: "TeacherService",
      errno: 1,
      error: "'teacherId' parameter is not an integer: fail",
      statusCode: 400
    }]), { status: 400 });
    await act(async () => {
      userEvent.click(screen.getByTestId('l-1'))
    });
    expect(screen.getByTestId("selected-lecture")).toBeInTheDocument();
    expect(screen.getByText('Student : invalid parameter error')).toBeInTheDocument();
  });

  test('testing interaction between LecturePanel-StudentPanel (students API : error parsing error)', async () => {
    await fetchLectureSuccess();
    fetch.mockResponseOnce(JSON.stringify(), { status: 400 });
    await act(async () => {
      userEvent.click(screen.getByTestId('l-1'))
    });
    expect(screen.getByTestId("selected-lecture")).toBeInTheDocument();
    expect(screen.getByText('Student : server error')).toBeInTheDocument();
  });

  test('testing interaction between LecturePanel-StudentPanel (students API : server connection error)', async () => {
    await fetchLectureSuccess();
    fetch.mockRejectOnce();
    await act(async () => {
      userEvent.click(screen.getByTestId('l-1'))
    });
    expect(screen.getByTestId("selected-lecture")).toBeInTheDocument();
    expect(screen.getByText('Student : server error')).toBeInTheDocument();
  });

  test('testing EditModal component and related buttons (PUT success)', async () => {
    await setupEditModal();
    expect(screen.getByText("Edit Delivery")).toBeInTheDocument();
    await act(async () => {
      userEvent.click(screen.getByTestId("no-m-1"));
    });
    await act(async () => {
      userEvent.click(screen.getByTestId('m-1'))
    });
    fetch.mockResponseOnce(JSON.stringify({ body: "ok" }), { status: 204 });
    await act(async () => {
      userEvent.click(screen.getByTestId("yes-m-1"));
    });
    let items = screen.getAllByText("Remote");
    expect(items).toHaveLength(2);
  });

  test('testing EditModal component and related buttons (PUT failure : error)', async () => {
    await setupEditModal();
    fetch.mockResponseOnce(JSON.stringify({ body: "not ok" }), { status: 400 });
    await act(async () => {
      userEvent.click(screen.getByTestId("yes-m-1"));
    });
    expect(screen.getByText("Lecture : can't update delivery")).toBeInTheDocument();
  });

  test('testing EditModal component and related buttons (PUT failure : error parsing error)', async () => {
    await setupEditModal();
    fetch.mockResponseOnce({}, { status: 400 });
    await act(async () => {
      userEvent.click(screen.getByTestId("yes-m-1"));
    });
    expect(screen.getByText("Lecture : server error")).toBeInTheDocument();
  });

  test('testing EditModal component and related buttons (PUT failure : server connection error)', async () => {
    await setupEditModal();
    fetch.mockRejectOnce();
    await act(async () => {
      userEvent.click(screen.getByTestId("yes-m-1"));
    });
    expect(screen.getByText("Lecture : server error")).toBeInTheDocument();
  });

  test('testing DeleteModal component and related buttons (DELETE success)', async () => {
    await setupDeleteModal();
    await act(async () => {
      userEvent.click(screen.getByTestId("no-d-1"));
    });
    await act(async () => {
      userEvent.click(screen.getByTestId('l-1'))
    });
    await act(async () => {
      userEvent.click(screen.getByTestId('d-1'))
    });
    fetch.mockResponseOnce(JSON.stringify({ body: "ok" }), { status: 204 });
    await act(async () => {
      userEvent.click(screen.getByTestId("yes-d-1"));
    });
    let items = screen.getAllByTestId('lecture-row');
    expect(items).toHaveLength(4); //num lectures 5 -> 4, but pagination still provides 4 lectures
  });

  test('testing DeleteModal component and related buttons (DELETE failure : error)', async () => {
    await setupDeleteModal();
    fetch.mockResponseOnce(JSON.stringify({ body: "not ok" }), { status: 400 });
    await act(async () => {
      userEvent.click(screen.getByTestId("yes-d-1"));
    });
    expect(screen.getByText("Lecture : can't delete lecture")).toBeInTheDocument();
  });

  test('testing DeleteModal component and related buttons (DELETE failure : error parsing error)', async () => {
    await setupDeleteModal();
    fetch.mockResponseOnce({}, { status: 400 });
    await act(async () => {
      userEvent.click(screen.getByTestId("yes-d-1"));
    });
    expect(screen.getByText("Lecture : server error")).toBeInTheDocument();
  });

  test('testing DeleteModal component and related buttons (DELETE failure : server connection error)', async () => {
    await setupDeleteModal();
    fetch.mockRejectOnce();
    await act(async () => {
      userEvent.click(screen.getByTestId("yes-d-1"));
    });
    expect(screen.getByText("Lecture : server error")).toBeInTheDocument();
  });

  test('testing student status update (PUT success)', async () => {
    await setupStudentUpdate();
    expect(screen.getByText("no present students.")).toBeInTheDocument();
    fetch.mockResponseOnce(JSON.stringify({ body: "ok" }), { status: 204 });
    await act(async () => {
      userEvent.click(screen.getAllByTestId('student-row')[0]);
    });
    expect(screen.getByTestId("number-students-1")).toBeInTheDocument();
  })

  test('testing student status update (PUT failure : error)', async () => {
    await setupStudentUpdate();
    fetch.mockResponseOnce(JSON.stringify({ statusCode: 404, message: "something went wrong!" }), { status: 404 });
    await act(async () => {
      userEvent.click(screen.getAllByTestId('student-row')[0]);
    });
    expect(screen.getByText("404 : something went wrong!")).toBeInTheDocument();
  })

  test('testing student status update (PUT failure : error parsing error)', async () => {
    await setupStudentUpdate();
    fetch.mockResponseOnce({}, { status: 404 });
    await act(async () => {
      userEvent.click(screen.getAllByTestId('student-row')[0]);
    });
    expect(screen.getByText("Student : server error")).toBeInTheDocument();
  })

  test('testing student status update (PUT failure : server connection error)', async () => {
    await setupStudentUpdate();
    fetch.mockRejectOnce();
    await act(async () => {
      userEvent.click(screen.getAllByTestId('student-row')[0]);
    });
    expect(screen.getByText("Student : server error")).toBeInTheDocument();
  })

});
