import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { UserEntity } from './users.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService, fakeUserService: Partial<UsersService>;
  beforeEach(async () => {
    const users: UserEntity[] = [];
    fakeUserService = {
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
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: fakeUserService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('can create an instance of auth service', async () => {
    expect(service).toBeDefined();
  });

  it('creates a new user with a salted and hashed password', async () => {
    const user = await service.signup('asdf@test.com', '12345');

    expect(user.password).not.toEqual('12345');
    const [salt, hash] = user.password.split('.');
    expect(salt).toBeDefined();
    expect(hash).toBeDefined();
  });

  it('throws an error if user signs up with the email that is in use', async () => {
    await service.signup('asft@asdf.com', '12345');
    expect(service.signup('asft@asdf.com', '12345')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws an error if signin is called with an unused email', async () => {
    expect(service.signin('test@test.com', '12345')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws an error if invalid password is provided', async () => {
    await service.signup('asft@asdf.com', 'abcde');
    expect(service.signin('asft@asdf.com', '12345')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('returns a user if correct password is provided', async () => {
    await service.signup('test@test.com', '12345');
    const user = await service.signin('test@test.com', '12345');
    expect(user).toBeDefined();
    expect(user.email).toBe('test@test.com');
  });
});
