describe('Presentation', function() {
  'use strict';
  var title = '자바스크립트를 멋지게 사용해보세요',
      presenter = '박길벗';

  describe('객체 생성', function() {
    it('"new"를 사용하지 않으면 예외를 던진다', function() {
      expect(function createWithoutNew() {
        Conference.Presentation(title);
      }).toThrowError(Conference.Presentation.messages.mustUseNew);
    });

    it('"new"를 사용하면 성공한다', function() {
      new Conference.Presentation(title); // 예외를 던지지 않음
    });

    it('제목이 누락되면 예외를 던진다', function() {
      expect(function createWithoutTitle() {
        new Conference.Presentation();
      }).toThrowError(Conference.Presentation.messages.titleRequired);
    });
  });
});