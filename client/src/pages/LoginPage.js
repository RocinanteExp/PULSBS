import React from "react";
import Form from "react-bootstrap/Form";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import API from '../api/Api';
import ErrorMsg from "../components/ErrorMsg";

class LoginPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = { username: "", password: "", fetchError: false };
  }

  onChangeUsername = (event) => {
    this.setState({ username: event.target.value });
  };

  onChangePassword = (event) => {
    this.setState({ password: event.target.value });
  };

  handleSubmit = (event) => {
    event.preventDefault();
    API.userLogin(this.state.username, this.state.password)
      .then((user) => this.userLogin(user))
      .catch((error) => {
        let errormsg = error.source + " : " + error.error;
        this.setState({ fetchError: errormsg })
      });
  };
  userLogin = (user) => {
    this.props.setLoggedInUser(user);
  }
  onClose = () => {
    this.setState({ fetchError: false });
  }

  render() {

    return (
      <Container fluid id="containerLogin">
        <Row>
          <Col>
            <h2>
              <div className="content">Log-in to your account</div>
            </h2>

            <Form
              method="POST"
              onSubmit={(event) =>
                this.handleSubmit(event)
              }
            >
              <Form.Group controlId="username">
                <Form.Label>E-mail</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  placeholder="E-mail"
                  value={this.state.username}
                  onChange={(ev) => this.onChangeUsername(ev)}
                  required
                  autoFocus
                  data-testid="emailForm"
                />
              </Form.Group>

              <Form.Group controlId="password">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={this.state.password}
                  onChange={(ev) => this.onChangePassword(ev)}
                  required
                  data-testid="passwordForm"
                />
              </Form.Group>

              <Button variant="warning" type="submit">
                Login
                    </Button>
            </Form>
            <br />
            {this.state.fetchError &&
              <ErrorMsg msg={this.state.fetchError} onClose={this.onClose} />
            }
          </Col>
        </Row>
      </Container>
    );
  }
}

export default LoginPage;
