import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthService } from './auth.service';
import { UserEntity } from './users.entity';
import { NotFoundException } from '@nestjs/common';

describe('UsersController', () => {
  let controller: UsersController;
  let fakeUserService: Partial<UsersService>;
  let fakeAuthService: Partial<AuthService>;

  beforeEach(async () => {
    const users: UserEntity[] = [];
    fakeUserService = {
      findOne: (id: number) => {
        const user = users.find((user) => user.id === id);
        return Promise.resolve(user);
      },
      find: (email: string) => {
        const user = users.filter((user) => user.email === email);
        return Promise.resolve(user);
      },
      create: (email: string, password: string) => {
        const user = {
          id: Math.floor(Math.random() * 9999),
          email,
          password,
        } as UserEntity;
        users.push(user);
        return Promise.resolve(user);
      },
      remove: (id: number) => {
        const user = users.find((user) => user.id === id);
        delete users[users.indexOf(user)];
        return Promise.resolve(user);
      },
      update: (id: number, attrs: Partial<UserEntity>) => {
        const user = users.find((user) => user.id === id);
        const userIndex = users.findIndex((user) => user.id === id);
        const updatedUser = Object.assign(user, attrs);
        users[userIndex] = updatedUser;
        return Promise.resolve(updatedUser);
      },
    };

    fakeAuthService = {
      signup: (email: string, password: string) => {
        return Promise.resolve(fakeUserService.create(email, password));
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      signin: (email: string, _password: string) => {
        return Promise.resolve(users.find((user) => user.email === email));
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: fakeUserService,
        },
        {
          provide: AuthService,
          useValue: fakeAuthService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('throws an error if email is not found', async () => {
    expect(controller.findUser('1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findAllUsers returns a list of users with the given email', async () => {
    const user = await fakeAuthService.signup('test@test.com', '12345');
    const users = await controller.findAllUsers(user.email);
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('test@test.com');
  });

  it('findOne returns a user with the given email', async () => {
    const newUser = await fakeAuthService.signup('test1@test.com', '12345');
    const user = await controller.findUser(newUser.id.toString());
    expect(user.email).toBe('test1@test.com');
  });

  it('signin updates session object and returns user', async () => {
    const session = { userId: -10 };
    const newUser = await fakeAuthService.signup('test2@test.com', '12345');
    const user = await controller.signin(
      { email: newUser.email, password: newUser.password },
      session,
    );

    expect(user.id).toBe(newUser.id);
    expect(session.userId).toBe(newUser.id);
    expect(user.email).toBe(newUser.email);
    expect(user.password).toBe(newUser.password);
  });
});
